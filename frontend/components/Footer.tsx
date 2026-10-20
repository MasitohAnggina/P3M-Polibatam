import Image from "next/image";
import Link from "next/link";
import { Poppins } from "next/font/google";

import {
  Mail,
  MapPin,
  Phone,
  ExternalLink,
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

export default function Footer() {
  return (
    <footer className={`${poppins.className} bg-[#31551F] text-[#F5F1DE]`}>
      <div className="mx-auto max-w-[1180px] px-5 md:px-6">

        {/* =====================================================
            MAIN FOOTER
        ===================================================== */}

        <div className="grid gap-10 border-b border-[#F5F1DE]/20 py-11 md:grid-cols-[1.65fr_0.9fr_0.9fr_1.3fr] md:gap-12 md:py-14">

          {/* =================================================
              BRAND
          ================================================= */}

          <div>

            {/* LOGO PARTNER */}

            <div className="flex h-[55px] items-center gap-5">

              <Image
                src="/img/Logo_kemendikti.png"
                alt="Kementerian Pendidikan Tinggi, Sains, dan Teknologi"
                width={150}
                height={50}
                className="h-[38px] w-auto object-contain"
              />

              <div className="h-9 w-px bg-[#F5F1DE]/25" />

              <Image
                src="/img/Logo_sdgs.png"
                alt="Sustainable Development Goals"
                width={300}
                height={100}
                className="h-[68px] w-auto object-contain"
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

          <div>

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

          <div>

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

          <div>

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


            {/* WEBSITE */}

            <a
              href="https://p2m.polibatam.ac.id/"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-[#F5F1DE]/75 transition-all duration-300 hover:translate-x-1 hover:text-[#FAF8EC]"
            >
              Website P2M

              <ExternalLink
                size={12}
                strokeWidth={1.8}
              />
            </a>

          </div>

        </div>


        {/* =====================================================
            BOTTOM FOOTER
        ===================================================== */}

        <div className="flex flex-col gap-2 py-5 text-[11.5px] text-[#F5F1DE]/60 md:flex-row md:items-center md:justify-between">

          <p>
            © 2026 Pusat Penelitian dan Pengabdian kepada
            Masyarakat Politeknik Negeri Batam.
          </p>

          <span className="text-[#F5F1DE]/55">
            P2M Polibatam
          </span>

        </div>

      </div>
    </footer>
  );
}