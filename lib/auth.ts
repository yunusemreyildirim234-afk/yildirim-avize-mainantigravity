import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

export const authOptions: NextAuthOptions = {
  // Prisma Adapter: Google gibi OAuth girişlerinde User ve Account kayıtlarını senkronize eder
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adapter: PrismaAdapter(prisma) as any,
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 Gün boyunca oturum düşmez
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      allowDangerousEmailAccountLinking: true,
    }),
    CredentialsProvider({
      name: "E-posta ve Şifre",
      credentials: {
        email: { label: "E-posta", type: "email", placeholder: "ornek@yildirimavize.com" },
        password: { label: "Şifre", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Lütfen e-posta adresinizi ve şifrenizi girin.");
        }

        const email = credentials.email.trim().toLowerCase();
        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user) {
          throw new Error("Bu e-posta adresine ait bir hesap bulunamadı.");
        }

        if (!user.password || user.password === "guest_checkout") {
          throw new Error(
            "Bu e-posta adresiyle daha önce misafir siparişi verilmiş. Lütfen 'Kayıt Ol' alanından şifrenizi belirleyerek hesabınızı aktifleştirin."
          );
        }

        // Şifre kontrolü (bcryptjs)
        const isPasswordValid = await bcrypt.compare(credentials.password, user.password);

        // Eski düz metin şifreler varsa otomatik olarak bcrypt ile hash'e yükselt
        if (!isPasswordValid && user.password === credentials.password) {
          const newHashedPassword = await bcrypt.hash(credentials.password, 12);
          await prisma.user.update({
            where: { id: user.id },
            data: { password: newHashedPassword },
          });
          return user;
        }

        if (!isPasswordValid) {
          throw new Error("Girdiğiniz şifre hatalı.");
        }

        return user;
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (!user.email) return false;

      // Google OAuth ile giriş yapıldığında sabit yönetici kontrolü ve profil eşitleme
      const isOwnerEmail =
        user.email === "yunusemreyildirim234@gmail.com" ||
        user.email === "iletisim@yildirimavize.com";

      try {
        const existing = await prisma.user.findUnique({
          where: { email: user.email },
        });

        if (existing) {
          // Eğer sabit yönetici hesabıysa rolünü ve Kargonomi bilgilerini eksiksiz güncelle
          if (isOwnerEmail && existing.role !== "ADMIN") {
            await prisma.user.update({
              where: { id: existing.id },
              data: {
                role: "ADMIN",
                customerCode: "JFHFVZ01",
                phone: "5458126990",
                taxNumber: "10022539990",
                taxOffice: "Beyoğlu",
                accountType: "Bireysel / Firma Değilim",
                dealerCode: "86",
                monthlyVolume: "500+",
                address:
                  "Bereketzade Mah. Tevfikiye Han, İskender Cad, Nazlı Hanım Sk. No:6 D:11, Şişhane Beyoğlu / İstanbul",
                stateId: 34,
                cityId: 425,
                stateName: "İstanbul",
                cityName: "Beyoğlu",
              },
            });
          }
        }
      } catch (err) {
        console.error("[NextAuth signIn callback error]:", err);
      }

      return true;
    },
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        token.role = (user as any).role || "USER";
      }

      // Kullanıcı profil güncellediğinde session verisini tazele
      if (trigger === "update" && session) {
        return { ...token, ...session.user };
      }

      // Veritabanından güncel profil verilerini token'a yükle
      if (token.id) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              phone: true,
              customerCode: true,
              taxNumber: true,
              taxOffice: true,
              accountType: true,
              dealerCode: true,
              monthlyVolume: true,
              address: true,
              stateId: true,
              cityId: true,
              stateName: true,
              cityName: true,
            },
          });

          if (dbUser) {
            token.role = dbUser.role;
            token.phone = dbUser.phone;
            token.customerCode = dbUser.customerCode;
            token.taxNumber = dbUser.taxNumber;
            token.taxOffice = dbUser.taxOffice;
            token.accountType = dbUser.accountType;
            token.dealerCode = dbUser.dealerCode;
            token.monthlyVolume = dbUser.monthlyVolume;
            token.address = dbUser.address;
            token.stateId = dbUser.stateId;
            token.cityId = dbUser.cityId;
            token.stateName = dbUser.stateName;
            token.cityName = dbUser.cityName;
          }
        } catch {
          // sessiz devam et
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user && token) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const u = session.user as any;
        u.id = token.id as string;
        u.role = token.role as string;
        u.phone = token.phone as string | null;
        u.customerCode = token.customerCode as string | null;
        u.taxNumber = token.taxNumber as string | null;
        u.taxOffice = token.taxOffice as string | null;
        u.accountType = token.accountType as string | null;
        u.dealerCode = token.dealerCode as string | null;
        u.monthlyVolume = token.monthlyVolume as string | null;
        u.address = token.address as string | null;
        u.stateId = token.stateId as number | null;
        u.cityId = token.cityId as number | null;
        u.stateName = token.stateName as string | null;
        u.cityName = token.cityName as string | null;
      }
      return session;
    },
  },
  pages: {
    signIn: "/giris",
    error: "/giris",
  },
  secret: process.env.NEXTAUTH_SECRET || "yildirim_avize_nextauth_super_secret_jwt_key_2026",
};
