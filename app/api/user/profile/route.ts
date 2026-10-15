import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// Kullanıcının Canlı Kargonomi ve Profil Sabitleri
const OWNER_DEFAULTS = {
  name: "Yunus Emre Yıldırım (Yıldırım Avize Aydınlatma)",
  email: "yunusemreyildirim234@gmail.com",
  phone: "5458126990",
  customerCode: "JFHFVZ01",
  taxNumber: "10022539990",
  taxOffice: "Beyoğlu",
  accountType: "Bireysel / Firma Değilim",
  dealerCode: "86",
  monthlyVolume: "500+",
  address: "Bereketzade Mah. Tevfikiye Han, İskender Cad, Nazlı Hanım Sk. No:6 D:11, Şişhane Beyoğlu / İstanbul",
  stateId: 34,
  cityId: 425,
  stateName: "İstanbul",
  cityName: "Beyoğlu",
};

/**
 * GET: Giriş yapan kullanıcının profil ve Kargonomi verilerini getirir.
 */
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const { searchParams } = new URL(req.url);
    const queryEmail = searchParams.get("email");

    const email = session?.user?.email || queryEmail;

    if (!email) {
      return NextResponse.json({ error: "Oturum açılmamış veya e-posta belirtilmemiş." }, { status: 401 });
    }

    let user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        image: true,
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
        createdAt: true,
      },
    });

    // Eğer sabit yönetici hesabıysa ve alanlar henüz boşsa canlı verileri otomatik senkronize et
    if (
      user &&
      (user.email === OWNER_DEFAULTS.email || user.email === "iletisim@yildirimavize.com") &&
      !user.customerCode
    ) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          role: "ADMIN",
          ...OWNER_DEFAULTS,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          image: true,
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
          createdAt: true,
        },
      });
    }

    if (!user) {
      return NextResponse.json({ error: "Kullanıcı bulunamadı." }, { status: 404 });
    }

    return NextResponse.json({ success: true, profile: user });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

/**
 * PUT/POST: Kullanıcı profil ve Kargonomi hesap verilerini kalıcı olarak günceller.
 */
export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const body = await req.json();

    const targetEmail = body.email || session?.user?.email;

    if (!targetEmail) {
      return NextResponse.json({ error: "Güncellenecek hesap e-posta adresi bulunamadı." }, { status: 401 });
    }

    const email = String(targetEmail).trim().toLowerCase();

    // Eğer autoFillOwner bayrağı gönderildiyse sabit Yunus Emre Yıldırım canlı verilerini uygula
    const isOwner = email === OWNER_DEFAULTS.email || email === "iletisim@yildirimavize.com";

    const updateData: Record<string, unknown> = {};

    if (body.name !== undefined) updateData.name = String(body.name).trim();
    if (body.phone !== undefined) updateData.phone = String(body.phone).trim();
    if (body.customerCode !== undefined) updateData.customerCode = String(body.customerCode).trim();
    if (body.taxNumber !== undefined) updateData.taxNumber = String(body.taxNumber).trim();
    if (body.taxOffice !== undefined) updateData.taxOffice = String(body.taxOffice).trim();
    if (body.accountType !== undefined) updateData.accountType = String(body.accountType).trim();
    if (body.dealerCode !== undefined) updateData.dealerCode = String(body.dealerCode).trim();
    if (body.monthlyVolume !== undefined) updateData.monthlyVolume = String(body.monthlyVolume).trim();
    if (body.address !== undefined) updateData.address = String(body.address).trim();
    if (body.stateId !== undefined) updateData.stateId = Number(body.stateId) || null;
    if (body.cityId !== undefined) updateData.cityId = Number(body.cityId) || null;
    if (body.stateName !== undefined) updateData.stateName = String(body.stateName).trim();
    if (body.cityName !== undefined) updateData.cityName = String(body.cityName).trim();

    if (body.syncOwnerDefaults || (isOwner && Object.keys(updateData).length === 0)) {
      Object.assign(updateData, OWNER_DEFAULTS, { role: "ADMIN" });
    }

    const updatedUser = await prisma.user.update({
      where: { email },
      data: updateData,
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
        updatedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Profil ve Kargonomi hesap bilgileriniz başarıyla güncellendi.",
      profile: updatedUser,
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  return PUT(req);
}
