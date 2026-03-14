const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const pool = require('../config/db');
const multer = require('multer');
const xml2js = require('xml2js');
const { calculateDistance, calculatePace, metersToKm } = require('../utils/geoUtils');

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

    // Calculate average pace (minutes per km) using utility
    const avgPace = calculatePace(distance, duration);
    const distanceKm = metersToKm(distance);

    // Create LineString from route points
    const coordinates = route.map(p => `${p.lng} ${p.lat}`).join(', ');
    const lineString = `LINESTRING(${coordinates})`;
    const startPoint = `POINT(${route[0].lng} ${route[0].lat})`;
    const endPoint = `POINT(${route[route.length - 1].lng} ${route[route.length - 1].lat})`;

    // Store run in database
    const newRun = await pool.query(
      `INSERT INTO runs 
       (user_id, distance, duration, pace, route_geometry, start_location, end_location, started_at, completed_at) 
       VALUES ($1, $2, $3, $4, ST_GeomFromText($5, 4326), ST_GeomFromText($6, 4326), ST_GeomFromText($7, 4326), $8, $9) 
       RETURNING *`,
      [req.user.id, distanceKm, duration, avgPace, lineString, startPoint, endPoint, route[0].timestamp, route[route.length - 1].timestamp]
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

module.exports = router;
