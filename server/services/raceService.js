const { redisClient, isRedisAvailable } = require('../middleware/rateLimiter');

class RaceService {
  constructor() {
    this.RACE_KEY_PREFIX = 'race:';
    this.RACE_PARTICIPANTS_PREFIX = 'race_participants:';
    // In-memory fallback when Redis unavailable
    this.memoryRaces = new Map();
    this.memoryParticipants = new Map();
  }

  _getRaceKey(raceId) {
    return `${this.RACE_KEY_PREFIX}${raceId}`;
  }

  _getParticipantsKey(raceId) {
    return `${this.RACE_PARTICIPANTS_PREFIX}${raceId}`;
  }

  async createRace(hostId, distanceKm) {
    const raceId = `race_${Date.now()}_${hostId}`;
    const raceData = {
      id: raceId,
      hostId,
      distanceKm,
      status: 'waiting',
      createdAt: Date.now(),
      startTime: null
    };

    if (isRedisAvailable()) {
      await redisClient.set(this._getRaceKey(raceId), JSON.stringify(raceData), {
        EX: 3600
      });
    } else {
      this.memoryRaces.set(raceId, raceData);
    }

    return raceData;
  }

  async joinRace(raceId, userId, username) {
    let race;
    if (isRedisAvailable()) {
      const raceRaw = await redisClient.get(this._getRaceKey(raceId));
      if (!raceRaw) throw new Error('Race not found');
      race = JSON.parse(raceRaw);
    } else {
      race = this.memoryRaces.get(raceId);
      if (!race) throw new Error('Race not found');
    }

    if (race.status !== 'waiting') throw new Error('Race already started or finished');

    const participantData = {
      userId,
      username,
      distanceCovered: 0,
      lastUpdate: Date.now(),
      finished: false,
      finishTime: null
    };

    if (isRedisAvailable()) {
      await redisClient.hSet(this._getParticipantsKey(raceId), userId.toString(), JSON.stringify(participantData));
    } else {
      if (!this.memoryParticipants.has(raceId)) {
        this.memoryParticipants.set(raceId, new Map());
      }
      this.memoryParticipants.get(raceId).set(userId.toString(), participantData);
    }
    
    return race;
  }

  async startRace(raceId, hostId) {
    let race;
    if (isRedisAvailable()) {
      const raceRaw = await redisClient.get(this._getRaceKey(raceId));
      if (!raceRaw) throw new Error('Race not found');
      race = JSON.parse(raceRaw);
    } else {
      race = this.memoryRaces.get(raceId);
      if (!race) throw new Error('Race not found');
    }

    if (race.hostId !== hostId) throw new Error('Only host can start the race');

    race.status = 'active';
    race.startTime = Date.now();

    if (isRedisAvailable()) {
      await redisClient.set(this._getRaceKey(raceId), JSON.stringify(race), {
        EX: 3600
      });
    } else {
      this.memoryRaces.set(raceId, race);
    }

    return race;
  }

  async updateProgress(raceId, userId, distanceKm) {
    let participant;
    if (isRedisAvailable()) {
      const participantRaw = await redisClient.hGet(this._getParticipantsKey(raceId), userId.toString());
      if (!participantRaw) return null;
      participant = JSON.parse(participantRaw);
    } else {
      const participants = this.memoryParticipants.get(raceId);
      if (!participants) return null;
      participant = participants.get(userId.toString());
      if (!participant) return null;
    }

    participant.distanceCovered = distanceKm;
    participant.lastUpdate = Date.now();

    let race;
    if (isRedisAvailable()) {
      const raceRaw = await redisClient.get(this._getRaceKey(raceId));
      race = JSON.parse(raceRaw);
    } else {
      race = this.memoryRaces.get(raceId);
    }

    if (distanceKm >= race.distanceKm && !participant.finished) {
      participant.finished = true;
      participant.finishTime = Date.now() - race.startTime;
    }

    if (isRedisAvailable()) {
      await redisClient.hSet(this._getParticipantsKey(raceId), userId.toString(), JSON.stringify(participant));
    } else {
      const participants = this.memoryParticipants.get(raceId);
      if (participants) {
        participants.set(userId.toString(), participant);
      }
    }
    
    return participant;
  }

  async getRaceState(raceId) {
    let race;
    let participants;

    if (isRedisAvailable()) {
      const raceRaw = await redisClient.get(this._getRaceKey(raceId));
      if (!raceRaw) return null;
      race = JSON.parse(raceRaw);
      const participantsRaw = await redisClient.hGetAll(this._getParticipantsKey(raceId));
      participants = Object.values(participantsRaw).map(p => JSON.parse(p));
    } else {
      race = this.memoryRaces.get(raceId);
      if (!race) return null;
      const participantsMap = this.memoryParticipants.get(raceId);
      participants = participantsMap ? Array.from(participantsMap.values()) : [];
    }
    
    race.participants = participants;
    return race;
  }
}

module.exports = new RaceService();
