# API Documentation

Base URL: `http://localhost:5000/api`

## Authentication Endpoints

### Register User
Create a new user account.

```
POST /auth/register
Content-Type: application/json
```

**Request Body:**
```json
{
  "username": "runner_name",
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error (400):**
```json
{
  "msg": "User already exists"
}
```

---

### Login User
Authenticate and receive JWT token.

```
POST /auth/login
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error (400):**
```json
{
  "msg": "Invalid credentials"
}
```

---

## User Endpoints

### Get Leaderboard
Retrieve global or city-specific leaderboard.

```
GET /users/leaderboard?city=New York
```

**Query Parameters:**
- `city` (optional) - Filter by city name

**Response (200):**
```json
[
  {
    "username": "runner1",
    "totalTiles": 1250,
    "totalDistance": 524.3,
    "city": "New York"
  },
  {
    "username": "runner2",
    "totalTiles": 980,
    "totalDistance": 412.5,
    "city": "New York"
  }
]
```

---

### Monthly Prize Draw
Select random winner from top 10 users.

```
POST /users/prize-draw
x-auth-token: <JWT_TOKEN>
```

**Response (200):**
```json
{
  "winner": "runner1",
  "prize": "RunTerra Pro Achievement Badge + $25 Gear Voucher"
}
```

---

## Run Endpoints

### Create Run
Record a new run.

```
POST /runs
Content-Type: application/json
x-auth-token: <JWT_TOKEN>
```

**Request Body:**
```json
{
  "distance": 5.2,
  "duration": 1800,
  "avgPace": 5.77,
  "route": [
    { "lat": 40.7128, "lng": -74.0060 },
    { "lat": 40.7130, "lng": -74.0058 }
  ]
}
```

**Response (200):**
```json
{
  "id": 455,
  "userId": 12,
  "distance": 5.2,
  "duration": 1800,
  "avgPace": 5.77,
  "route": "[...]",
  "createdAt": "2026-03-04T10:30:00Z"
}
```

---

### Get User Runs
Retrieve all runs for authenticated user.

```
GET /runs
x-auth-token: <JWT_TOKEN>
```

**Response (200):**
```json
[
  {
    "id": 455,
    "userId": 12,
    "distance": 5.2,
    "duration": 1800,
    "avgPace": 5.77,
    "createdAt": "2026-03-04T10:30:00Z"
  }
]
```

---

## Tile Endpoints

### Capture Tiles
Capture tiles from a route (geohashed locations).

```
POST /tiles/capture
Content-Type: application/json
x-auth-token: <JWT_TOKEN>
```

**Request Body:**
```json
{
  "route": [
    { "lat": 40.7128, "lng": -74.0060 },
    { "lat": 40.7130, "lng": -74.0058},
    { "lat": 40.7135, "lng": -74.0055 }
  ]
}
```

**Response (200):**
```json
[
  {
    "id": 1,
    "geohash": "dr5regf",
    "location": {"type": "Point", "coordinates": [-74.0060, 40.7128]},
    "ownerId": 12,
    "capturedAt": "2026-03-04T10:30:00Z",
    "history": []
  },
  {
    "id": 2,
    "geohash": "dr5regh",
    "location": {"type": "Point", "coordinates": [-74.0058, 40.7130]},
    "ownerId": 12,
    "capturedAt": "2026-03-04T10:30:00Z",
    "history": [
      {
        "owner": 11,
        "timestamp": "2026-03-02T15:45:00Z"
      }
    ]
  }
]
```

---

### Get All Tiles
Retrieve all captured tiles on the map.

```
GET /tiles
```

**Response (200):**
```json
[
  {
    "id": 1,
    "geohash": "dr5regf",
    "ownerId": 12,
    "capturedAt": "2026-03-04T10:30:00Z"
  }
]
```

---

## GPX Endpoints

### Upload GPX File
Upload and parse GPX from running watch/app.

```
POST /gpx/upload
Content-Type: multipart/form-data
x-auth-token: <JWT_TOKEN>
```

**Form Data:**
```
gpxFile: <GPX_FILE>
```

**Response (200):**
```json
{
  "msg": "GPX file uploaded successfully",
  "run": {
    "id": 456,
    "userId": 12,
    "distance": 10.5,
    "duration": 3600,
    "avgPace": 5.71,
    "route": "[...]",
    "createdAt": "2026-03-04T10:30:00Z"
  }
}
```

**Error (400):**
```json
{
  "msg": "Error parsing GPX file",
  "error": "Error details"
}
```

---

### Get All Runs
Retrieve all runs (including GPX uploads).

```
GET /gpx
```

**Response (200):**
```json
[
  {
    "id": 456,
    "userId": 12,
    "distance": 10.5,
    "duration": 3600,
    "avgPace": 5.71,
    "createdAt": "2026-03-04T10:30:00Z"
  }
]
```

---

## Zone Endpoints

### Get All Zones
Retrieve all geographic zones.

```
GET /zones
```

**Response (200):**
```json
[
  {
    "id": 1,
    "name": "Central Park",
    "ownerId": 12,
    "totalTiles": 156,
    "boundary": {"type": "Polygon", "coordinates": [...]}
  }
]
```

---

## Event Endpoints

### Get All Events
Retrieve active game events/challenges.

```
GET /events
```

**Response (200):**
```json
[
  {
    "id": 1,
    "name": "Manhattan Takeover",
    "description": "Capture 50 tiles in Manhattan",
    "status": "active",
    "prize": "Limited Edition Badge",
    "endDate": "2026-03-31T23:59:59Z"
  }
]
```

---

## Training Plan Endpoints

### Create Training Plan
Create a personalized training plan.

```
POST /training-plans
Content-Type: application/json
x-auth-token: <JWT_TOKEN>
```

**Request Body:**
```json
{
  "planType": "beginner",
  "workouts": [
    {
      "day": "Monday",
      "type": "easy",
      "distance": 3.0,
      "duration": 1800
    },
    {
      "day": "Wednesday",
      "type": "intervals",
      "distance": 5.0,
      "duration": 1200
    }
  ]
}
```

**Response (200):**
```json
{
  "id": 1,
  "userId": 12,
  "planType": "beginner",
  "workouts": "[...]",
  "createdAt": "2026-03-04T10:30:00Z"
}
```

---

### Get User Training Plan
Retrieve user's current training plan.

```
GET /training-plans
x-auth-token: <JWT_TOKEN>
```

**Response (200):**
```json
{
  "id": 1,
  "userId": 12,
  "planType": "beginner",
  "workouts": [...]
}
```

---

## Error Codes

| Code | Message | Meaning |
|------|---------|---------|
| 400 | User already exists | Email/username taken |
| 400 | Invalid credentials | Wrong email/password |
| 400 | No file uploaded | Missing GPX file |
| 401 | No token | Missing authentication token |
| 401 | Token is not valid | Invalid/expired token |
| 404 | No eligible users found | Prize draw error |
| 500 | Server Error | Internal server error |

---

## Rate Limiting

Currently no rate limiting implemented. Consider adding for production.

---

## Authentication Header

Include JWT token in all protected endpoints:

```
x-auth-token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

**API Version**: 1.0.0
**Last Updated**: March 2026
