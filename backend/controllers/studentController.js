const mongoose = require("mongoose");
const Student = require("../models/Student");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const FIELDS = ["studentId", "name", "email", "department", "semester", "contact"];

// Pick only known fields (prevents injecting unexpected keys / operators)
function pick(body) {
  const out = {};
  for (const f of FIELDS) {
    if (body[f] !== undefined && body[f] !== null) {
      out[f] = typeof body[f] === "string" ? body[f].trim() : body[f];
    }
  }
  return out;
}

function validate(data, { partial = false } = {}) {
  const errors = [];
  const required = ["studentId", "name", "email", "department", "semester"];
  if (!partial) {
    for (const f of required) if (data[f] === undefined || data[f] === "") errors.push(`${f} is required`);
  }
  for (const f of ["studentId", "name", "email", "department", "contact"]) {
    if (data[f] !== undefined && typeof data[f] !== "string") errors.push(`${f} must be text`);
  }
  if (typeof data.email === "string" && data.email && !EMAIL_RE.test(data.email)) errors.push("email is not valid");
  if (data.semester !== undefined) {
    const s = Number(data.semester);
    if (!Number.isInteger(s) || s < 1 || s > 12) errors.push("semester must be a whole number between 1 and 12");
    else data.semester = s;
  }
  if (typeof data.contact === "string" && data.contact && !/^\d{10}$/.test(data.contact)) {
    errors.push("contact must be a 10-digit number");
  }
  return errors;
}

// :id may be the business key (e.g. ST101) or a MongoDB _id
function findFilter(id) {
  const or = [{ studentId: String(id).toUpperCase() }];
  if (mongoose.Types.ObjectId.isValid(id)) or.push({ _id: id });
  return { $or: or };
}

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

exports.getAll = async (req, res, next) => {
  try {
    const filter = {};
    const q = req.query.search;
    if (typeof q === "string" && q.trim()) {
      const rx = new RegExp(escapeRegex(q.trim()), "i");
      filter.$or = [{ studentId: rx }, { name: rx }, { email: rx }, { department: rx }];
    }
    const students = await Student.find(filter).sort({ studentId: 1 });
    res.json({ success: true, count: students.length, data: students });
  } catch (err) { next(err); }
};

exports.getOne = async (req, res, next) => {
  try {
    const student = await Student.findOne(findFilter(req.params.id));
    if (!student) return res.status(404).json({ success: false, message: "Student not found" });
    res.json({ success: true, data: student });
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const data = pick(req.body);
    const errors = validate(data);
    if (errors.length) return res.status(400).json({ success: false, message: "Validation failed", errors });
    const student = await Student.create(data);
    res.status(201).json({ success: true, message: "Student added successfully", data: student });
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const data = pick(req.body);
    delete data.studentId; // business key is immutable
    const errors = validate(data, { partial: true });
    if (errors.length) return res.status(400).json({ success: false, message: "Validation failed", errors });
    const student = await Student.findOneAndUpdate(findFilter(req.params.id), data, {
      new: true,
      runValidators: true
    });
    if (!student) return res.status(404).json({ success: false, message: "Student not found" });
    res.json({ success: true, message: "Student updated successfully", data: student });
  } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try {
    const student = await Student.findOneAndDelete(findFilter(req.params.id));
    if (!student) return res.status(404).json({ success: false, message: "Student not found" });
    res.json({ success: true, message: "Student deleted successfully" });
  } catch (err) { next(err); }
};
