const express = require("express");
const c = require("../controllers/studentController");

const router = express.Router();

router.get("/", c.getAll);        // GET    /api/students  (optional ?search=term)
router.get("/:id", c.getOne);     // GET    /api/students/:id
router.post("/", c.create);       // POST   /api/students
router.put("/:id", c.update);     // PUT    /api/students/:id
router.delete("/:id", c.remove);  // DELETE /api/students/:id

module.exports = router;
