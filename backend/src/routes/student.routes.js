import express from "express";
import { authenticate } from "../middlewares/auth.middleware.js";
import { allowRoles } from "../middlewares/role.middleware.js";
import {
  getStudentProfile,
  updateStudentBio,
  getStudentSkills,
  addStudentSkill,
  deleteStudentSkill,
} from "../controllers/student.controller.js";

const router = express.Router();

// Profile
router.get(
  "/profile",
  authenticate,
  allowRoles("STUDENT"),
  getStudentProfile
);

// Bio
router.put(
  "/bio",
  authenticate,
  allowRoles("STUDENT"),
  updateStudentBio
);

// Skills
router.get(
  "/skills",
  authenticate,
  allowRoles("STUDENT"),
  getStudentSkills
);

router.post(
  "/skills",
  authenticate,
  allowRoles("STUDENT"),
  addStudentSkill
);

router.delete(
  "/skills/:id",
  authenticate,
  allowRoles("STUDENT"),
  deleteStudentSkill
);

export default router;
