import Image from "next/image";
import Link from "next/link";
import { Poppins } from "next/font/google";

import {
  Mail,
  MapPin,
  Phone,
} from "lucide-react";

/* Poppins bukan variable font, jadi weight harus ditulis */
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

/* gaya link dan judul kolom dipakai berulang, jadi dibuat satu kali */
const LINK_CLASS =
  "w-fit text-[13px] font-medium text-[#F5F1DE]/75 transition-all duration-300 hover:translate-x-1 hover:text-[#FAF8EC]";

const HEADING_CLASS =
  "text-[11.5px] font-semibold uppercase tracking-[0.14em] text-[#FAF8EC]";

const ICON_BOX_CLASS =
  "flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[#F5F1DE]/10";

const NAVIGASI = [
  { label: "Profil", href: "/profil" },
  { label: "Penelitian", href: "/penelitian" },
  { label: "Pengabdian", href: "/pengabdian" },
  { label: "Publikasi", href: "/publikasi" },
];

const INFORMASI = [
  { label: "HKI", href: "/hki/hki" },
  { label: "Informasi", href: "/informasi" },
  { label: "Infografis", href: "/infografis" },
];

/* =========================================================
   LAYOUT RESPONSIF FOOTER
   Susunan kolom ditentukan oleh LEBAR WADAH footer (container
   query), bukan breakpoint Tailwind "md:". Jadi hasilnya sama
   di Chrome dan Edge, apa pun zoom atau ukuran font browsernya.
     wadah >= 720px : 4 kolom (brand, navigasi, informasi, kontak)
     di bawahnya    : 1 kolom
   Footer tampil di semua halaman, jadi aturan html font-size di
   bawah otomatis berlaku untuk seluruh situs (padding, ikon, dan
   jarak yang memakai rem tidak ikut membesar di browser dengan
   pengaturan font besar).
========================================================= */

const FOOTER_STYLE = `
  html {
    font-size: 16px;
  }

  .footer-wrap {
    container-type: inline-size;
  }

  .footer-grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 40px;
    padding-block: 44px;
  }

  .footer-bottom {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding-block: 20px;
  }

  @container (min-width: 720px) {
    .footer-grid {
      grid-template-columns:
        minmax(0, 1.65fr) minmax(0, 0.9fr) minmax(0, 0.9fr) minmax(0, 1.3fr);
      gap: 48px;
      padding-block: 56px;
    }

    .footer-bottom {
      flex-direction: row;
      align-items: center;
      justify-content: space-between;
    }
  }
`;

export default function Footer() {
  return (
    <footer className={`${poppins.className} bg-[#31551F] text-[#F5F1DE]`}>
      <style>{FOOTER_STYLE}</style>

      <div className="mx-auto max-w-[1180px] px-5 md:px-6">
        <div className="footer-wrap">

          {/* =====================================================
              MAIN FOOTER
          ===================================================== */}

          <div className="footer-grid border-b border-[#F5F1DE]/20">

            {/* =================================================
                BRAND
                min-w-0: kolom grid boleh menyempit, jadi isinya
                tidak mendorong (meluap) ke kolom di sebelahnya.
            ================================================= */}

            <div className="min-w-0">

              {/* LOGO PARTNER
                  Tinggi logo dibuat lebih kecil supaya total lebarnya
                  muat di kolom ini. flex-wrap jaga-jaga kalau layar
                  sempit: logo turun ke baris bawah, bukan meluap. */}

              <div className="flex max-w-full flex-wrap items-center gap-x-4 gap-y-3">

                <Image
                  src="/img/Logo kemendikti.webp"
                  alt="Kementerian Pendidikan Tinggi, Sains, dan Teknologi"
                  width={150}
                  height={50}
                  className="h-[38px] w-auto max-w-full object-contain"
                />

                <div
                  aria-hidden
                  className="hidden h-8 w-px bg-[#F5F1DE]/25 sm:block"
                />

                <Image
                  src="/img/Logo SDGs.webp"
                  alt="Sustainable Development Goals"
                  width={300}
                  height={100}
                  className="h-[32px] w-auto max-w-full object-contain"
                />

              </div>


              {/* BRAND TITLE */}

              <div className="mt-7">

                <h2 className="text-[18px] font-semibold tracking-[-0.01em] text-[#FAF8EC] md:text-[19px]">
                  P2M POLIBATAM
                </h2>

                <p className="mt-2 max-w-[380px] text-[13px] leading-[1.75] text-[#F5F1DE]/80">
                  Pusat Penelitian dan Pengabdian kepada Masyarakat
                  Politeknik Negeri Batam.
                </p>

              </div>


              {/* DESCRIPTION */}

              <p className="mt-4 max-w-[400px] text-[12px] leading-[1.8] text-[#F5F1DE]/65">
                Mendukung kegiatan penelitian dan pengabdian kepada
                masyarakat untuk menghasilkan inovasi yang bermanfaat
                bagi masyarakat dan industri.
              </p>

            </div>


            {/* =================================================
                NAVIGASI
            ================================================= */}

            <div className="min-w-0">

              <h3 className={HEADING_CLASS}>Navigasi</h3>

              <nav className="mt-5 flex flex-col gap-3.5">
                {NAVIGASI.map((item) => (
                  <Link key={item.href} href={item.href} className={LINK_CLASS}>
                    {item.label}
                  </Link>
                ))}
              </nav>

            </div>


            {/* =================================================
                INFORMASI
            ================================================= */}

            <div className="min-w-0">

              <h3 className={HEADING_CLASS}>Informasi</h3>

              <nav className="mt-5 flex flex-col gap-3.5">
                {INFORMASI.map((item) => (
                  <Link key={item.href} href={item.href} className={LINK_CLASS}>
                    {item.label}
                  </Link>
                ))}
              </nav>

            </div>


            {/* =================================================
                KONTAK
            ================================================= */}

            <div className="min-w-0">

              <h3 className={HEADING_CLASS}>Kontak</h3>

              <div className="mt-5 space-y-4">

                {/* ADDRESS */}

                <div className="flex items-start gap-3">

                  <div className={ICON_BOX_CLASS}>
                    <MapPin
                      size={15}
                      strokeWidth={1.7}
                      className="text-[#F5F1DE]/80"
                    />
                  </div>

                  <p className="pt-0.5 text-[12.5px] leading-[1.7] text-[#F5F1DE]/75">
                    Jl. Ahmad Yani, Batam Kota,
                    <br />
                    Kepulauan Riau 29461
                  </p>

                </div>


                {/* PHONE */}

                <div className="flex items-center gap-3">

                  <div className={ICON_BOX_CLASS}>
                    <Phone
                      size={15}
                      strokeWidth={1.7}
                      className="text-[#F5F1DE]/80"
                    />
                  </div>

                  <span className="text-[12.5px] text-[#F5F1DE]/75">
                    Politeknik Negeri Batam
                  </span>

                </div>


                {/* EMAIL */}

                <div className="flex items-center gap-3">

                  <div className={ICON_BOX_CLASS}>
                    <Mail
                      size={15}
                      strokeWidth={1.7}
                      className="text-[#F5F1DE]/80"
                    />
                  </div>

                  <span className="text-[12.5px] text-[#F5F1DE]/75">
                    P2M Polibatam
                  </span>

                </div>

              </div>

            </div>

          </div>


          {/* =====================================================
              BOTTOM FOOTER
          ===================================================== */}

          <div className="footer-bottom text-[11.5px] text-[#F5F1DE]/60">

            <p>
              © 2026 Pusat Penelitian dan Pengabdian kepada
              Masyarakat Politeknik Negeri Batam.
            </p>

            <span className="text-[#F5F1DE]/55">
              P2M Polibatam
            </span>

          </div>

        </div>
      </div>
    </footer>
  );
}