const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const pool = require('../config/db');
const multer = require('multer');
const xml2js = require('xml2js');

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/gpx+xml' || file.originalname.endsWith('.gpx')) {
      cb(null, true);
    } else {
      cb(new Error('Only GPX files are allowed'));
    }
  },
});

// @route   POST api/gpx/upload
// @desc    Upload and parse GPX file
// @access  Private
router.post('/upload', auth, upload.single('gpxFile'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ msg: 'No file uploaded' });
  }

  try {
    const parser = new xml2js.Parser();
    const gpxData = await parser.parseStringPromise(req.file.buffer.toString());

    // Extract route points from GPX
    const route = [];
    let distance = 0;
    let duration = 0;

    // Handle GPX track points
    if (gpxData.gpx && gpxData.gpx.trk) {
      const tracks = Array.isArray(gpxData.gpx.trk) ? gpxData.gpx.trk : [gpxData.gpx.trk];

      for (const track of tracks) {
        if (track.trkseg) {
          const segments = Array.isArray(track.trkseg) ? track.trkseg : [track.trkseg];

          for (const segment of segments) {
            if (segment.trkpt) {
              const points = Array.isArray(segment.trkpt) ? segment.trkpt : [segment.trkpt];

              for (let i = 0; i < points.length; i++) {
                const point = points[i];
                const lat = parseFloat(point.$.lat);
                const lng = parseFloat(point.$.lon);
                const ele = point.ele ? parseFloat(point.ele[0]) : 0;
                const time = point.time ? new Date(point.time[0]) : null;

                route.push({ lat, lng, elevation: ele, timestamp: time });

                // Calculate distance between consecutive points
                if (i > 0) {
                  const prevPoint = points[i - 1];
                  const prevLat = parseFloat(prevPoint.$.lat);
                  const prevLng = parseFloat(prevPoint.$.lon);
                  distance += calculateDistance(prevLat, prevLng, lat, lng);
                }

                // Calculate duration if timestamps exist
                if (i === 0 && time) {
                  duration = 0;
                } else if (i > 0 && time && points[i - 1].time) {
                  const prevTime = new Date(points[i - 1].time[0]);
                  duration += (time - prevTime) / 1000; // in seconds
                }
              }
            }
          }
        }
      }
    }

    // Calculate average pace (minutes per km)
    const avgPace = distance > 0 ? (duration / 60) / (distance / 1000) : 0;

    // Store run in database
    const newRun = await pool.query(
      'INSERT INTO runs (userid, distance, duration, avgpace, route) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [req.user.id, distance, duration, avgPace, JSON.stringify(route)]
    );

    res.json({
      msg: 'GPX file uploaded successfully',
      run: newRun.rows[0],
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: 'Error parsing GPX file', error: err.message });
  }
});

// @route   GET api/gpx
// @desc    Get all GPX runs
// @access  Public
router.get('/', async (req, res) => {
  try {
    const runs = await pool.query('SELECT id, userid, distance, duration, avgpace FROM runs');
    res.json(runs.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Helper function to calculate distance between two coordinates (Haversine formula)
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

module.exports = router;
