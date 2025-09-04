import { z } from 'zod';
import bcrypt from 'bcrypt';

// Validation du mot de passe fort
const passwordSchema = z.string()
  .min(8, "Le mot de passe doit contenir au moins 8 caractères")
  .max(100, "Le mot de passe ne peut pas dépasser 100 caractères")
  .regex(/[A-Z]/, "Le mot de passe doit contenir au moins une majuscule")
  .regex(/[a-z]/, "Le mot de passe doit contenir au moins une minuscule")
  .regex(/[0-9]/, "Le mot de passe doit contenir au moins un chiffre")
  .regex(/[!@#$%^&*(),.?":{}|<>]/, "Le mot de passe doit contenir au moins un caractère spécial");

// Schéma de validation pour la création d'utilisateur
export const userCreationSchema = z.object({
  username: z.string()
    .min(3, "Le nom d'utilisateur doit contenir au moins 3 caractères")
    .max(50, "Le nom d'utilisateur ne peut pas dépasser 50 caractères")
    .regex(/^[a-zA-Z0-9_-]+$/, "Le nom d'utilisateur ne peut contenir que des lettres, chiffres, tirets et underscores")
    .transform(val => val.toLowerCase()),
  
  email: z.string()
    .email("Email invalide")
    .max(255, "Email trop long")
    .transform(val => val.toLowerCase()),
  
  password: passwordSchema,
  
  confirmPassword: z.string(),
  
  firstName: z.string()
    .min(2, "Le prénom doit contenir au moins 2 caractères")
    .max(50, "Le prénom ne peut pas dépasser 50 caractères")
    .regex(/^[a-zA-ZÀ-ÿ\s\-']+$/, "Le prénom contient des caractères non autorisés"),
  
  lastName: z.string()
    .min(2, "Le nom doit contenir au moins 2 caractères")
    .max(50, "Le nom ne peut pas dépasser 50 caractères")
    .regex(/^[a-zA-ZÀ-ÿ\s\-']+$/, "Le nom contient des caractères non autorisés"),
  
  role: z.enum([
    "admin",
    "manager",
    "validator",
    "business_unit_manager",
    "contract_manager",
    "finance_manager"
  ], {
    errorMap: () => ({ message: "Rôle invalide" })
  }),
  
  department: z.string()
    .min(2, "Le département est requis")
    .max(100, "Le département est trop long")
    .optional(),
  
  phone: z.string()
    .regex(/^(?:(?:\+|00)33|0)\s*[1-9](?:[\s.-]*\d{2}){4}$/, "Numéro de téléphone invalide")
    .optional(),
  
  isActive: z.boolean().default(true)
}).refine(data => data.password === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"]
});

// Schéma de validation pour la connexion
export const loginSchema = z.object({
  username: z.string()
    .min(1, "Le nom d'utilisateur est requis")
    .transform(val => val.toLowerCase()),
  
  password: z.string()
    .min(1, "Le mot de passe est requis")
});

// Schéma pour la mise à jour du profil utilisateur
export const userUpdateSchema = z.object({
  email: z.string()
    .email("Email invalide")
    .transform(val => val.toLowerCase())
    .optional(),
  
  firstName: z.string()
    .min(2, "Le prénom doit contenir au moins 2 caractères")
    .max(50, "Le prénom ne peut pas dépasser 50 caractères")
    .optional(),
  
  lastName: z.string()
    .min(2, "Le nom doit contenir au moins 2 caractères")
    .max(50, "Le nom ne peut pas dépasser 50 caractères")
    .optional(),
  
  department: z.string()
    .max(100, "Le département est trop long")
    .optional(),
  
  phone: z.string()
    .regex(/^(?:(?:\+|00)33|0)\s*[1-9](?:[\s.-]*\d{2}){4}$/, "Numéro de téléphone invalide")
    .optional()
});

// Schéma pour le changement de mot de passe
export const passwordChangeSchema = z.object({
  currentPassword: z.string()
    .min(1, "Le mot de passe actuel est requis"),
  
  newPassword: passwordSchema,
  
  confirmNewPassword: z.string()
}).refine(data => data.newPassword === data.confirmNewPassword, {
  message: "Les nouveaux mots de passe ne correspondent pas",
  path: ["confirmNewPassword"]
}).refine(data => data.currentPassword !== data.newPassword, {
  message: "Le nouveau mot de passe doit être différent de l'ancien",
  path: ["newPassword"]
});

// Fonction de validation pour la création d'utilisateur
export async function validateUserCreation(data: any) {
  try {
    const validated = userCreationSchema.parse(data);
    
    // Hacher le mot de passe
    const hashedPassword = await bcrypt.hash(validated.password, 10);
    
    // Retourner les données validées sans confirmPassword et avec le mot de passe haché
    const { confirmPassword, ...userDataWithoutConfirm } = validated;
    
    return {
      success: true,
      data: {
        ...userDataWithoutConfirm,
        password: hashedPassword
      }
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const formattedErrors = error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }));
      return {
        success: false,
        errors: formattedErrors,
        message: "Données invalides : " + formattedErrors.map(e => e.message).join(', ')
      };
    }
    return {
      success: false,
      message: "Erreur de validation inconnue"
    };
  }
}

// Fonction de validation pour la connexion
export function validateLogin(data: any) {
  try {
    const validated = loginSchema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const formattedErrors = error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }));
      return {
        success: false,
        errors: formattedErrors,
        message: "Identifiants invalides"
      };
    }
    return {
      success: false,
      message: "Erreur de validation"
    };
  }
}

// Validation des données d'import CSV/Excel
export const userImportSchema = z.object({
  username: z.string().min(3).transform(val => val.toLowerCase()),
  email: z.string().email().transform(val => val.toLowerCase()),
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  role: z.string(),
  department: z.string().optional(),
  temporaryPassword: z.string().min(8).optional()
});

// Export des types TypeScript
export type UserCreationData = z.infer<typeof userCreationSchema>;
export type LoginData = z.infer<typeof loginSchema>;
export type UserUpdateData = z.infer<typeof userUpdateSchema>;
export type PasswordChangeData = z.infer<typeof passwordChangeSchema>;
export type UserImportData = z.infer<typeof userImportSchema>;