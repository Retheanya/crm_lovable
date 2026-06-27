const leadService = require('../services/lead.service');
const fs = require('fs');
const csv = require('csv-parser');

const createLead = async (req, res, next) => {
  try {
    const lead = await leadService.createLead(req.body, req.user._id);
    res.status(201).json({ success: true, data: lead });
  } catch (error) {
    next(error);
  }
};

const getLeads = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, sort, status, search } = req.query;
    const options = {
      skip: (page - 1) * limit,
      limit: parseInt(limit),
      sort: sort ? { [sort.split(':')[0]]: sort.split(':')[1] === 'desc' ? -1 : 1 } : { createdAt: -1 }
    };

    const result = await leadService.getLeads({ status, search }, options, req.user);
    res.status(200).json({
      success: true,
      count: result.leads.length,
      total: result.total,
      data: result.leads
    });
  } catch (error) {
    next(error);
  }
};

const getLeadById = async (req, res, next) => {
  try {
    const lead = await leadService.getLeadById(req.params.id, req.user);
    res.status(200).json({ success: true, data: lead });
  } catch (error) {
    next(error);
  }
};

const updateLead = async (req, res, next) => {
  try {
    const lead = await leadService.updateLead(req.params.id, req.body, req.user);
    res.status(200).json({ success: true, data: lead });
  } catch (error) {
    next(error);
  }
};

const updateStatus = async (req, res, next) => {
  try {
    const lead = await leadService.updateStatus(req.params.id, req.body.status, req.user);
    res.status(200).json({ success: true, data: lead });
  } catch (error) {
    next(error);
  }
};

const assignLead = async (req, res, next) => {
  try {
    const lead = await leadService.assignLead(req.params.id, req.body.assignedUser, req.user);
    res.status(200).json({ success: true, data: lead });
  } catch (error) {
    next(error);
  }
};

const deleteLead = async (req, res, next) => {
  try {
    await leadService.deleteLead(req.params.id, req.user);
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};

const logUpdate = async (req, res, next) => {
  try {
    const lead = await leadService.logUpdate(req.params.id, req.body, req.user);
    res.status(200).json({ success: true, data: lead });
  } catch (error) {
    next(error);
  }
};

const downloadSampleCsv = (req, res) => {
  const header = "Lead Name,Company Name,Email,Phone Number,Location,Status,Source,Value,Notes\n";
  const row = "John Doe,Acme Corp,john.doe@example.com,+1234567890,New York,New,Website,5000,Important lead\n";
  res.setHeader('Content-disposition', 'attachment; filename=leads_sample.csv');
  res.set('Content-Type', 'text/csv');
  res.status(200).send(header + row);
};

const uploadCsv = (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }
    
    if (req.file.size === 0) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ success: false, error: 'Uploaded file is empty' });
    }
    
    const results = [];
    fs.createReadStream(req.file.path)
      .pipe(csv({ mapHeaders: ({ header }) => header.trim().replace(/^[\uFEFF\u200B]+/, '') }))
      .on('data', (data) => results.push(data))
      .on('end', () => {
        fs.unlinkSync(req.file.path);
        if (results.length === 0) {
          return res.status(400).json({ success: false, error: 'CSV file contains no data rows' });
        }
        res.status(200).json({ success: true, data: results });
      })
      .on('error', (error) => {
        fs.unlinkSync(req.file.path);
        next(error);
      });
  } catch (error) {
    next(error);
  }
};

const validateCsv = async (req, res, next) => {
  try {
    const result = await leadService.validateCsv(req.body.rows, req.user);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

const importCsv = async (req, res, next) => {
  try {
    const result = await leadService.importCsv(req.body.rows, req.user);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createLead,
  getLeads,
  getLeadById,
  updateLead,
  updateStatus,
  assignLead,
  deleteLead,
  logUpdate,
  downloadSampleCsv,
  uploadCsv,
  validateCsv,
  importCsv
};
