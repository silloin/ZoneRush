import axios from 'axios';

const isSafeId = (id) => {
  const n = parseInt(id, 10);
  return Number.isInteger(n) && n > 0;
};

const EmergencyService = {
  getContacts: async () => {
    return axios.get('/emergency/contacts');
  },

  addContact: async (formData) => {
    return axios.post('/emergency/contacts', formData);
  },

  updateContact: async (id, formData) => {
    if (!isSafeId(id)) throw new Error('Invalid contact ID');
    return axios.put(`/emergency/contacts/${id}`, formData);
  },

  deleteContact: async (id) => {
    if (!isSafeId(id)) throw new Error('Invalid contact ID');
    return axios.delete(`/emergency/contacts/${id}`);
  },

  sendSOS: async (location, customMessage) => {
    return axios.post('/emergency/send-sos', {
      latitude: location.latitude,
      longitude: location.longitude,
      message: customMessage || null
    });
  }
};

export default EmergencyService;
