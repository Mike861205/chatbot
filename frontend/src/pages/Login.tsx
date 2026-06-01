import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import { MessageSquare, Eye, EyeOff } from "lucide-react";
import { authApi } from "../services/api";
import { useAuthStore } from "../store/authStore";

const schema = z.object({
  mode: z.enum(["tenant", "super"]),
  slug: z.string().optional(),
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "Requerido"),
});

type FormData = z.infer<typeof schema>;

export default function Login() {
  const [mode, setMode] = useState<"tenant" | "super">("tenant");
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { mode: "tenant" },
  });

  const onSubmit = async (data: FormData) => {
    try {
      let res;
      if (mode === "super") {
        res = await authApi.superLogin(data.email, data.password);
        const { token, user } = res.data;
        setAuth(token, user, undefined, true);
      } else {
        if (!data.slug) {
          toast.error("Ingresa el slug del restaurante");
          return;
        }
        res = await authApi.login(data.slug, data.email, data.password);
        const { token, user, tenant } = res.data;
        setAuth(token, user, tenant, false);
      }
      navigate("/");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })
        ?.response?.data?.error;
      toast.error(msg ?? "Credenciales inválidas");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-purple-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-600 rounded-2xl mb-4 shadow-lg">
            <MessageSquare size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">RestauBot</h1>
          <p className="text-gray-500 mt-1">Panel de administración</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Mode toggle */}
          <div className="flex rounded-lg bg-gray-100 p-1 mb-6">
            {(["tenant", "super"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                  mode === m
                    ? "bg-white text-purple-700 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {m === "tenant" ? "🍽️ Restaurante" : "🛡️ Super Admin"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {mode === "tenant" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Slug del restaurante
                </label>
                <input
                  {...register("slug")}
                  type="text"
                  placeholder="mi-restaurante"
                  className="input"
                />
                {errors.slug && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.slug.message}
                  </p>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                {...register("email")}
                type="email"
                placeholder="admin@restaurante.com"
                className="input"
              />
              {errors.email && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contraseña
              </label>
              <div className="relative">
                <input
                  {...register("password")}
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="input pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.password.message}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full py-2.5 mt-2"
            >
              {isSubmitting ? "Ingresando..." : "Iniciar sesión"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
