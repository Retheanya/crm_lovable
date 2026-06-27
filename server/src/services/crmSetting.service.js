const crmSettingRepository = require('../repositories/crmSetting.repository');
const ErrorResponse = require('../utils/errorResponse');
const { ROLES } = require('../constants');

// Default seed data
const DEFAULTS = {
  LEAD_STATUS: [
    { label: 'New',           value: 'NEW',           isSystem: true,  order: 0 },
    { label: 'Contacted',     value: 'CONTACTED',     isSystem: true,  order: 1 },
    { label: 'Follow-Up',     value: 'FOLLOW_UP',     isSystem: true,  order: 2 },
    { label: 'Proposal Sent', value: 'PROPOSAL_SENT', isSystem: false, order: 3 },
    { label: 'Negotiation',   value: 'NEGOTIATION',   isSystem: false, order: 4 },
    { label: 'Closed Won',    value: 'CLOSED',        isSystem: true,  order: 5 },
    { label: 'Closed Lost',   value: 'CLOSED_LOST',   isSystem: false, order: 6 },
  ],
  LEAD_SOURCE: [
    { label: 'Website',      value: 'WEBSITE',      isSystem: true,  order: 0 },
    { label: 'Email',        value: 'EMAIL',        isSystem: true,  order: 1 },
    { label: 'Call',         value: 'CALL',         isSystem: true,  order: 2 },
    { label: 'WhatsApp',     value: 'WHATSAPP',     isSystem: true,  order: 3 },
    { label: 'Referral',     value: 'REFERRAL',     isSystem: false, order: 4 },
    { label: 'LinkedIn',     value: 'LINKEDIN',     isSystem: false, order: 5 },
    { label: 'Facebook Ads', value: 'FACEBOOK_ADS', isSystem: false, order: 6 },
    { label: 'Google Ads',   value: 'GOOGLE_ADS',   isSystem: false, order: 7 },
  ],
  ACTIVITY_TYPE: [
    { label: 'Call',      value: 'CALL',      isSystem: true,  order: 0 },
    { label: 'Email',     value: 'EMAIL',     isSystem: true,  order: 1 },
    { label: 'WhatsApp',  value: 'WHATSAPP',  isSystem: true,  order: 2 },
    { label: 'Meeting',   value: 'MEETING',   isSystem: true,  order: 3 },
    { label: 'Demo',      value: 'DEMO',      isSystem: false, order: 4 },
    { label: 'Site Visit',value: 'SITE_VISIT',isSystem: false, order: 5 },
    { label: 'Proposal',  value: 'PROPOSAL',  isSystem: false, order: 6 },
  ]
};

class CrmSettingService {
  /**
   * Ensure defaults are seeded into the DB (idempotent via upsert)
   */
  async seed() {
    const CrmSetting = require('../models/CrmSetting');
    for (const [category, items] of Object.entries(DEFAULTS)) {
      for (const item of items) {
        await CrmSetting.updateOne(
          { category, value: item.value },
          { $setOnInsert: { category, ...item } },
          { upsert: true }
        );
      }
    }
  }

  async getAll() {
    const all = await crmSettingRepository.findAll();
    // Group by category
    const grouped = {};
    for (const item of all) {
      if (!grouped[item.category]) grouped[item.category] = [];
      grouped[item.category].push(item);
    }
    return grouped;
  }

  async getByCategory(category) {
    return crmSettingRepository.findByCategory(category);
  }

  async create(data, user) {
    if (user.role !== ROLES.SUPER_ADMIN) {
      throw new ErrorResponse('Only SUPER_ADMIN can manage CRM settings', 403);
    }
    const { category, label, value, isActive } = data;
    if (!category || !label || !value) {
      throw new ErrorResponse('category, label and value are required', 400);
    }
    return crmSettingRepository.create({ category, label, value: value.toUpperCase().replace(/\s+/g, '_'), isActive: isActive !== false });
  }

  async update(id, data, user) {
    if (user.role !== ROLES.SUPER_ADMIN) {
      throw new ErrorResponse('Only SUPER_ADMIN can manage CRM settings', 403);
    }
    const setting = await crmSettingRepository.findById(id);
    if (!setting) throw new ErrorResponse('Setting not found', 404);

    const allowed = {};
    if (data.label !== undefined) allowed.label = data.label;
    if (data.isActive !== undefined) allowed.isActive = data.isActive;
    if (data.order !== undefined) allowed.order = data.order;
    // Don't allow changing value/category of system settings
    if (!setting.isSystem && data.value !== undefined) allowed.value = data.value.toUpperCase().replace(/\s+/g, '_');

    return crmSettingRepository.update(id, allowed);
  }

  async delete(id, user) {
    if (user.role !== ROLES.SUPER_ADMIN) {
      throw new ErrorResponse('Only SUPER_ADMIN can manage CRM settings', 403);
    }
    const setting = await crmSettingRepository.findById(id);
    if (!setting) throw new ErrorResponse('Setting not found', 404);
    if (setting.isSystem) throw new ErrorResponse('System settings cannot be deleted. You can deactivate them instead.', 400);
    return crmSettingRepository.delete(id);
  }

  async reorder(category, items, user) {
    if (user.role !== ROLES.SUPER_ADMIN) {
      throw new ErrorResponse('Only SUPER_ADMIN can manage CRM settings', 403);
    }
    return crmSettingRepository.reorder(items);
  }
}

module.exports = new CrmSettingService();
