import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

// ─────────────────────────────────────────────────────────────
// GET: Oturumu Doğrula ve Canlı Kullanıcı Verisini Getir
// ─────────────────────────────────────────────────────────────
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ authenticated: false, user: null }, { status: 200 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email.toLowerCase() },
      include: {
        orders: {
          include: {
            items: {
              include: { variation: true },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ authenticated: false, user: null }, { status: 200 });
    }

    // Şifreyi asla istemciye gönderme
    const { password: _pwd, ...safeUser } = user;

    return NextResponse.json({
      authenticated: true,
      user: safeUser,
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────
// POST: Kayıt, Giriş ve Güvenli Hesap Yükseltme (Bcryptjs)
// ─────────────────────────────────────────────────────────────
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const action = String(body.action || "").trim();
    const name = body.name ? String(body.name).trim() : "";
    const email = body.email ? String(body.email).trim().toLowerCase() : "";
    const password = body.password ? String(body.password) : "";

    // 1. GERÇEK GOOGLE HESABI İLE GİRİŞ & KAYIT
    if (action === "google") {
      if (!email) {
        return NextResponse.json({ error: "Google hesabından e-posta bilgisi alınamadı." }, { status: 400 });
      }

      let user = await prisma.user.findUnique({
        where: { email },
        include: {
          orders: {
            include: { items: { include: { variation: true } } },
            orderBy: { createdAt: "desc" },
          },
        },
      });

      const isOwner =
        email === "yunusemreyildirim234@gmail.com" ||
        email === "iletisim@yildirimavize.com";

      if (!user) {
        user = await prisma.user.create({
          data: {
            name: name || (isOwner ? "Yunus Emre Yıldırım" : "Google Kullanıcısı"),
            email,
            password: null, // OAuth kullanıcıları için şifre boştur
            role: isOwner ? "ADMIN" : "USER",
            ...(isOwner
              ? {
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
                }
              : {}),
          },
          include: {
            orders: {
              include: { items: { include: { variation: true } } },
              orderBy: { createdAt: "desc" },
            },
          },
        });
      } else if (isOwner && user.role !== "ADMIN") {
        user = await prisma.user.update({
          where: { id: user.id },
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
          include: {
            orders: {
              include: { items: { include: { variation: true } } },
              orderBy: { createdAt: "desc" },
            },
          },
        });
      }

      const { password: _pwd, ...safeUser } = user;
      return NextResponse.json({ success: true, user: safeUser });
    }

    if (!email || !password) {
      return NextResponse.json({ error: "E-posta ve şifre zorunludur." }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "Şifreniz en az 6 karakter olmalıdır." }, { status: 400 });
    }

    // 2. STANDART KAYIT OLMA & MİSAFİR HESABI GÜVENLİ YÜKSELTME
    if (action === "register") {
      const existingUser = await prisma.user.findUnique({
        where: { email },
        include: {
          orders: {
            include: { items: { include: { variation: true } } },
            orderBy: { createdAt: "desc" },
          },
        },
      });

      // Şifreyi bcryptjs ile 12 tur tuzlayarak şifreliyoruz
      const hashedPassword = await bcrypt.hash(password, 12);

      // Daha önce sepette misafir alışverişi yapmış olan kullanıcıyı aktifleştir
      if (existingUser && (!existingUser.password || existingUser.password === "guest_checkout")) {
        const activatedUser = await prisma.user.update({
          where: { email },
          data: {
            name: name || existingUser.name || "Müşteri",
            password: hashedPassword,
          },
          include: {
            orders: {
              include: { items: { include: { variation: true } } },
              orderBy: { createdAt: "desc" },
            },
          },
        });

        const { password: _pwd, ...safeUser } = activatedUser;
        return NextResponse.json({
          success: true,
          message: "Misafir sipariş geçmişiniz hesabınıza aktarıldı ve şifreniz başarıyla kaydedildi.",
          user: safeUser,
        });
      }

      if (existingUser) {
        return NextResponse.json(
          { error: "Bu e-posta adresiyle zaten kayıtlı bir hesap var. Lütfen giriş yapın." },
          { status: 400 }
        );
      }

      const isOwner =
        email === "yunusemreyildirim234@gmail.com" ||
        email === "iletisim@yildirimavize.com";

      const newUser = await prisma.user.create({
        data: {
          name: name || (isOwner ? "Yunus Emre Yıldırım" : "Müşteri"),
          email,
          password: hashedPassword,
          role: isOwner ? "ADMIN" : "USER",
          ...(isOwner
            ? {
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
              }
            : {}),
        },
      });

      const { password: _pwd, ...safeUser } = newUser;
      return NextResponse.json({
        success: true,
        user: { ...safeUser, orders: [] },
      });
    }

    // 3. STANDART GİRİŞ YAPMA (LOGIN)
    if (action === "login") {
      const user = await prisma.user.findUnique({
        where: { email },
        include: {
          orders: {
            include: { items: { include: { variation: true } } },
            orderBy: { createdAt: "desc" },
          },
        },
      });

      if (!user) {
        return NextResponse.json({ error: "Geçersiz e-posta veya şifre." }, { status: 401 });
      }

      if (!user.password || user.password === "guest_checkout") {
        return NextResponse.json(
          {
            error:
              "Bu e-posta adresiyle daha önce misafir siparişi verilmiş. Lütfen 'Kayıt Ol' alanından şifrenizi belirleyerek hesabınızı aktifleştirin.",
          },
          { status: 400 }
        );
      }

      // bcryptjs ile şifre kontrolü
      const isPasswordValid = await bcrypt.compare(password, user.password);

      // Veritabanında eski düz metin şifre kalmışsa otomatik hash'e yükselt
      if (!isPasswordValid && user.password === password) {
        const upgradedHash = await bcrypt.hash(password, 12);
        await prisma.user.update({
          where: { id: user.id },
          data: { password: upgradedHash },
        });
      } else if (!isPasswordValid) {
        return NextResponse.json({ error: "Geçersiz e-posta veya şifre." }, { status: 401 });
      }

      const { password: _pwd, ...safeUser } = user;
      return NextResponse.json({
        success: true,
        user: safeUser,
      });
    }

    return NextResponse.json({ error: "Geçersiz işlem." }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}