import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Phone, Mail, User, Trash2, Edit2, Plus, X, Save } from 'lucide-react';
import EmergencyService from '../services/emergencyService';

const EmergencyContacts = () => {
  const [contacts, setContacts] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    contactName: '',
    contactType: 'parent',
    phoneNumber: '',
    email: '',
    priority: 1
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    try {
      const res = await EmergencyService.getContacts();
      setContacts(res.data);
    } catch (err) {
      console.error('Error fetching contacts:', err);
    }
  };

  const handleAddContact = async () => {
    if (!formData.contactName || !formData.phoneNumber || !formData.email) {
      alert('Name, phone number, and email are required');
      return;
    }

    setLoading(true);
    try {
      await EmergencyService.addContact(formData);
      fetchContacts();
      setShowAddForm(false);
      setFormData({ contactName: '', contactType: 'parent', phoneNumber: '', email: '', priority: 1 });
    } catch (err) {
      console.error('Error adding contact:', err);
      alert('Failed to add contact');
    } finally {
      setLoading(false);
    }
  };

  const handleEditContact = async (id) => {
    setLoading(true);
    try {
      await EmergencyService.updateContact(id, formData);
      fetchContacts();
      setEditingId(null);
    } catch (err) {
      console.error('Error updating contact:', err);
      alert('Failed to update contact');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteContact = async (id) => {
    if (!confirm('Are you sure you want to delete this contact?')) return;

    try {
      await EmergencyService.deleteContact(id);
      fetchContacts();
    } catch (err) {
      console.error('Error deleting contact:', err);
      alert('Failed to delete contact');
    }
  };

  const startEdit = (contact) => {
    setEditingId(contact.id);
    setFormData({
      contactName: contact.contact_name,
      contactType: contact.contact_type,
      phoneNumber: contact.phone_number,
      email: contact.email || '',
      priority: contact.priority
    });
  };

  return (
    <div className="bg-gray-800 rounded-xl p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Phone className="text-red-500" size={24} />
          Emergency Contacts
        </h2>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition flex items-center gap-2"
        >
          <Plus size={18} />
          Add Contact
        </button>
      </div>

      {/* Add/Edit Form */}
      {(showAddForm || editingId) && (
        <div className="bg-gray-700 rounded-lg p-4 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <input
              type="text"
              placeholder="Contact Name *"
              value={formData.contactName}
              onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
            <select
              value={formData.contactType}
              onChange={(e) => setFormData({ ...formData, contactType: e.target.value })}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="parent">Parent</option>
              <option value="friend">Friend</option>
              <option value="spouse">Spouse</option>
              <option value="sibling">Sibling</option>
              <option value="custom">Custom</option>
            </select>
            <input
              type="tel"
              placeholder="Phone Number * (with country code)"
              value={formData.phoneNumber}
              onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
            <input
              type="email"
              placeholder="Email *"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              required
            />
            <input
              type="number"
              placeholder="Priority (1 = highest)"
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              min="1"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={editingId ? () => handleEditContact(editingId) : handleAddContact}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg transition flex items-center gap-2"
            >
              <Save size={18} />
              {loading ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={() => {
                setShowAddForm(false);
                setEditingId(null);
                setFormData({ contactName: '', contactType: 'parent', phoneNumber: '', email: '', priority: 1 });
              }}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition flex items-center gap-2"
            >
              <X size={18} />
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Contacts List */}
      <div className="space-y-3">
        {contacts.length === 0 ? (
          <p className="text-gray-400 text-center py-4">
            No emergency contacts added yet. Add contacts who will receive your SOS alerts.
          </p>
        ) : (
          contacts.map((contact) => (
            <div
              key={contact.id}
              className="bg-gray-700 rounded-lg p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-gray-650 transition"
            >
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <User size={20} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate">{contact.contact_name}</h3>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 text-sm text-gray-400 mt-1">
                    <span className="flex items-center gap-1">
                      <Phone size={14} className="flex-shrink-0" />
                      <span className="truncate">{contact.phone_number}</span>
                    </span>
                    {contact.email && (
                      <span className="flex items-center gap-1">
                        <Mail size={14} className="flex-shrink-0" />
                        <span className="truncate">{contact.email}</span>
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Type: {contact.contact_type} • Priority: {contact.priority}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0 self-end sm:self-center">
                <button
                  onClick={() => startEdit(contact)}
                  className="text-blue-400 hover:text-blue-300 p-2 rounded-lg hover:bg-blue-500/10 transition"
                  title="Edit contact"
                >
                  <Edit2 size={18} />
                </button>
                <button
                  onClick={() => handleDeleteContact(contact.id)}
                  className="text-red-400 hover:text-red-300 p-2 rounded-lg hover:bg-red-500/10 transition"
                  title="Delete contact"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default EmergencyContacts;
