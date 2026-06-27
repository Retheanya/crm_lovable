const crmSettingService = require('../services/crmSetting.service');

const getAll = async (req, res, next) => {
  try {
    const data = await crmSettingService.getAll();
    res.status(200).json({ success: true, data });
  } catch (err) { next(err); }
};

const getByCategory = async (req, res, next) => {
  try {
    const data = await crmSettingService.getByCategory(req.params.category.toUpperCase());
    res.status(200).json({ success: true, data });
  } catch (err) { next(err); }
};

const create = async (req, res, next) => {
  try {
    const setting = await crmSettingService.create(req.body, req.user);
    res.status(201).json({ success: true, data: setting });
  } catch (err) { next(err); }
};

const update = async (req, res, next) => {
  try {
    const setting = await crmSettingService.update(req.params.id, req.body, req.user);
    res.status(200).json({ success: true, data: setting });
  } catch (err) { next(err); }
};

const remove = async (req, res, next) => {
  try {
    await crmSettingService.delete(req.params.id, req.user);
    res.status(200).json({ success: true, message: 'Setting deleted' });
  } catch (err) { next(err); }
};

const reorder = async (req, res, next) => {
  try {
    // req.body: { category: string, items: [{ id, order }] }
    await crmSettingService.reorder(req.body.category, req.body.items, req.user);
    res.status(200).json({ success: true, message: 'Order updated' });
  } catch (err) { next(err); }
};

module.exports = { getAll, getByCategory, create, update, remove, reorder };
