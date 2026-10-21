import { z } from "zod";

export const registrationSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name").max(120, "Name is too long"),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(200, "Email is too long")
    .email("Enter a valid email address"),
  phone: z
    .string()
    .trim()
    .max(20, "Phone number is too long")
    .refine((v) => v === "" || /^[+0-9 ()-]{7,20}$/.test(v), "Enter a valid phone number"),
  institution: z.string().trim().max(150, "Too long"),
  notes: z.string().trim().max(1000, "Notes must be 1000 characters or fewer"),
});

export const organizationSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(80, "Name is too long"),
  description: z.string().trim().max(500, "Description must be 500 characters or fewer"),
  website: z
    .string()
    .trim()
    .max(200, "Link is too long")
    .refine((v) => {
      if (v === "") return true;
      try {
        return new URL(v).protocol === "https:" || new URL(v).protocol === "http:";
      } catch {
        return false;
      }
    }, "Enter a valid link (https://…)"),
});

export const memberRoleSchema = z.enum(["admin", "organizer", "viewer"], {
  errorMap: () => ({ message: "Choose a role" }),
});

export const addMemberSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  role: memberRoleSchema,
});

export const profileSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(80, "Name is too long"),
});

export const signUpSchema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(80, "Name is too long"),
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z
    .string()
    .min(8, "Use at least 8 characters")
    .max(128, "Password is too long"),
});

export const signInSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password").max(128),
});

export const forgotSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
});

export const resetSchema = z
  .object({
    password: z.string().min(8, "Use at least 8 characters").max(128),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    path: ["confirm"],
    message: "Passwords don't match",
  });
