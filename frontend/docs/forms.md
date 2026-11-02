# Forms and Validation (React Hook Form, Zod)

**React Hook Form** manages form state and submission. **Zod** describes what valid input looks like, and `@hookform/resolvers` connects the two. All three are installed, but the login and register pages currently use `useState` and hand-written `if` checks.

| Package | Version | Role |
|---|---|---|
| `react-hook-form` | 7.90 | Form state, field registration, submit handling, per-field errors |
| `zod` | 4.6 | Validation schema; also gives the TypeScript type of the form |
| `@hookform/resolvers` | 5.9 | `zodResolver(schema)` plugs Zod into React Hook Form |

## Register form vs backend

[`src/pages/registerPage.tsx`](../src/pages/registerPage.tsx) collects different fields from what the backend's User object needs ([backend/README.md](../../backend/README.md#31-user)):

| Register form today | Backend expects |
|---|---|
| `fullName` | `firstName` and `lastName` |
| no username field | `username`, required and unique (used to log in) |
| `role` picker (Student / Instructor) | Always `Student`. Only an Admin can promote someone to Instructor, so remove the picker. |
| password of 8 or more characters | 8–32 characters, at least 1 uppercase letter, 1 number and 1 special character |
| shows `alert("… đang chờ Auth API.")` | `POST /api/v1/auth/register` |

The login page needs to send `username` + `password` to `POST /api/v1/auth/login`.

## Recommended schema

Keep the password rules identical to the backend's [`password-policy.ts`](../../backend/src/modules/auth/password-policy.ts). The server checks them again either way.

```ts
import { z } from "zod";

export const registerSchema = z
  .object({
    username: z.string().min(3, "Tên đăng nhập tối thiểu 3 ký tự"),
    firstName: z.string().min(1, "Vui lòng nhập tên"),
    lastName: z.string().min(1, "Vui lòng nhập họ"),
    email: z.email("Email không hợp lệ"),
    password: z
      .string()
      .min(8, "Mật khẩu tối thiểu 8 ký tự")
      .max(32, "Mật khẩu tối đa 32 ký tự")
      .regex(/[A-Z]/, "Cần ít nhất 1 chữ hoa")
      .regex(/\d/, "Cần ít nhất 1 chữ số")
      .regex(/[^A-Za-z0-9]/, "Cần ít nhất 1 ký tự đặc biệt"),
    confirmPassword: z.string(),
    agreeTerms: z.literal(true, { error: "Bạn cần đồng ý điều khoản" }),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Mật khẩu xác nhận không khớp",
  });

export type RegisterInput = z.infer<typeof registerSchema>;
```

The 3-character minimum for `username` is a placeholder; the backend has not set a username rule yet.

## Using it in a page

```tsx
const { register, handleSubmit, formState: { errors, isSubmitting } } =
  useForm<RegisterInput>({ resolver: zodResolver(registerSchema) });

const onSubmit = async ({ confirmPassword, agreeTerms, ...body }: RegisterInput) => {
  await api.post("/auth/register", body);
  navigate("/login");
};

<form onSubmit={handleSubmit(onSubmit)}>
  <input {...register("username")} />
  {errors.username && <p className="text-sm text-red-600">{errors.username.message}</p>}
</form>
```

- `confirmPassword` and `agreeTerms` are checked only in the browser and not sent to the API.
- Show server errors (for example `409` when the username or email is taken) next to the matching field with `setError("username", { message })`.
