import { useMemo, useState } from "react";
import PublicLayout from "@/components/PublicLayout";
import { HOTELS, HOTELS_HERO_IMG } from "@/lib/content";
import { Star, MapPin, Wifi, Coffee, Waves, X, ArrowRight } from "lucide-react";
import { api, waLink } from "@/lib/api";
import HeroWhatsAppButton from "@/components/HeroWhatsAppButton";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Link } from "react-router-dom";

const TABS = [
  { id: "all", label: "All" },
  { id: "budget", label: "Budget Under ₹2,000" },
  { id: "standard", label: "Standard ₹2,000–₹5,000" },
  { id: "deluxe", label: "Deluxe ₹5,000–₹12,000" },
  { id: "luxury", label: "Luxury ₹12,000–₹30,000" },
  { id: "ultra", label: "Ultra Luxury ₹30,000+" },
];

const AMENITY_ICON = { Pool: Waves, WiFi: Wifi, Breakfast: Coffee };

export default function Hotels() {
  const [tab, setTab] = useState("all");
  const [poolOnly, setPoolOnly] = useState(false);
  const [breakfastOnly, setBreakfastOnly] = useState(false);
  const [openHotel, setOpenHotel] = useState(null);

  const filtered = useMemo(() => {
    return HOTELS.filter((h) => {
      if (tab !== "all" && h.category !== tab) return false;
      if (poolOnly && !h.amenities.includes("Pool")) return false;
      if (breakfastOnly && !h.amenities.includes("Breakfast")) return false;
      return true;
    });
  }, [tab, poolOnly, breakfastOnly]);

  return (
    <PublicLayout
      title="Hotels Near Ranthambore National Park — Best Stays | Ranthambore's Curator"
      description="Handpicked budget, deluxe and luxury hotels near Ranthambore National Park gate. Book safari and hotel together and save 15%."
    >
      <section className="relative -mt-[72px] pt-[72px] min-h-[55vh] flex items-center justify-center text-center text-white overflow-hidden">
        <img src={HOTELS_HERO_IMG} alt="Luxury jungle resort near Ranthambore National Park" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-[#C8860A]/40" />
        <div className="absolute inset-0 bg-black/30" />
        <div className="relative z-10 max-w-4xl px-6 py-16">
          <h1 className="font-serif font-bold text-4xl sm:text-5xl lg:text-6xl">Sleep Where the Jungle Breathes</h1>
          <p className="mt-4 text-white/85 text-lg max-w-2xl mx-auto">From mud-walled homestays to canvas suites with butlers — every property here is one we have vetted personally.</p>
          <div className="mt-8 flex justify-center">
            <HeroWhatsAppButton testId="hotels-hero-whatsapp" message="Hi! I'd like to book a hotel near Ranthambore. Please share availability." />
          </div>
        </div>
      </section>

      <section className="py-12 bg-[#F9F5EE]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-3 mb-6" data-testid="hotel-tabs">
            {TABS.map((t) => (
              <button
                key={t.id}
                data-testid={`hotel-tab-${t.id}`}
                onClick={() => setTab(t.id)}
                className={`whitespace-nowrap px-4 py-2 rounded-full text-sm border transition-colors ${tab === t.id ? "bg-[#1A2B1F] text-white border-[#1A2B1F]" : "bg-white border-stone-300 hover:border-[#1A2B1F]"}`}
              >{t.label}</button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-4 mb-6">
            <label className="text-sm flex items-center gap-2"><input type="checkbox" checked={poolOnly} onChange={(e)=>setPoolOnly(e.target.checked)} className="accent-[#C8860A]" /> Pool included</label>
            <label className="text-sm flex items-center gap-2"><input type="checkbox" checked={breakfastOnly} onChange={(e)=>setBreakfastOnly(e.target.checked)} className="accent-[#C8860A]" /> Breakfast included</label>
          </div>

          <div className="mb-8 flex items-center justify-between flex-wrap gap-3 bg-[#C8860A] text-white p-5 rounded-2xl shadow">
            <div>
              <div className="font-serif text-lg sm:text-2xl">Book Safari + Hotel Together — Save Up to 15%</div>
              <div className="text-white/90 text-sm">Bundle a stay with a safari and we&apos;ll match your zone and time.</div>
            </div>
            <Link to="/packages" data-testid="combo-deal-cta" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-[#1A2B1F] font-semibold text-sm">See Packages <ArrowRight className="w-4 h-4" /></Link>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((h, i) => (
              <article key={i} data-testid={`hotel-card-${i}`} className="bg-white rounded-2xl overflow-hidden border border-stone-200 hover:-translate-y-1 hover:shadow-xl transition-all">
                <div className="relative h-48 overflow-hidden">
                  <img src={h.img} alt={`${h.name} — Hotel near Ranthambore National Park`} className="w-full h-full object-cover" />
                  {h.combo && (
                    <span className="absolute top-3 right-3 text-[10px] uppercase tracking-wider bg-[#C8860A] text-white px-2 py-1 rounded-full">Combo Deal</span>
                  )}
                </div>
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-serif text-lg leading-tight">{h.name}</h3>
                    <span className="inline-flex items-center gap-1 text-sm font-medium"><Star className="w-4 h-4 fill-[#C8860A] text-[#C8860A]" />{h.stars}</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-stone-500 mt-1"><MapPin className="w-3 h-3" />{h.dist} from park gate</div>
                  <div className="flex gap-3 mt-3 text-stone-600">
                    {h.amenities.map((a) => {
                      const Icon = AMENITY_ICON[a];
                      return Icon ? <Icon key={a} className="w-4 h-4" title={a} /> : null;
                    })}
                  </div>
                  <div className="mt-4 flex items-end justify-between">
                    <div>
                      <div className="text-xs text-stone-500">From</div>
                      <div className="font-serif text-xl">₹{h.price.toLocaleString("en-IN")}<span className="text-xs text-stone-500">/night</span></div>
                    </div>
                    <button
                      data-testid={`hotel-book-${i}`}
                      onClick={() => setOpenHotel(h)}
                      className="inline-flex items-center gap-1 px-4 py-2 rounded-full bg-[#C8860A] hover:bg-[#a86f08] text-white text-sm font-semibold transition-colors"
                    >Book Now <ArrowRight className="w-4 h-4" /></button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <HotelModal hotel={openHotel} onClose={() => setOpenHotel(null)} />
    </PublicLayout>
  );
}

function HotelModal({ hotel, onClose }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [checkin, setCheckin] = useState("");
  const [checkout, setCheckout] = useState("");
  const [guests, setGuests] = useState(2);
  const [submitting, setSubmitting] = useState(false);

  if (!hotel) return null;

  async function submit(e) {
    e.preventDefault();
    if (!name || !phone || !checkin || !checkout) {
      toast.error("Please fill all required fields.");
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/inquiries", {
        type: "hotel",
        name, phone,
        message: `Enquiry for ${hotel.name} · ${checkin} → ${checkout} · ${guests} guests`,
        context: { hotel: hotel.name, checkin, checkout, guests, summary: `Hotel enquiry · ${hotel.name}` },
      });
      const wa = waLink(`Hi! Enquiry for ${hotel.name}. Name: ${name}, Phone: ${phone}. ${checkin} → ${checkout}, ${guests} guests.`);
      window.open(wa, "_blank");
      toast.success("Enquiry sent!");
      onClose();
    } catch {
      toast.error("Could not submit enquiry.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={!!hotel} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">{hotel.name}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-2 mb-4">
          {[0, 1, 2, 3].map((i) => (
            <img key={i} src={hotel.img} alt={`${hotel.name} gallery ${i+1}`} className="w-full h-32 object-cover rounded-lg" />
          ))}
        </div>
        <div className="text-sm text-stone-600 mb-4">
          <div className="flex items-center gap-1"><MapPin className="w-4 h-4" />{hotel.dist} from park gate · ⭐ {hotel.stars}</div>
          <div className="mt-2">Amenities: {hotel.amenities.join(" · ")}</div>
          <div className="mt-2">From <strong>₹{hotel.price.toLocaleString("en-IN")}</strong>/night</div>
        </div>
        <form onSubmit={submit} className="grid sm:grid-cols-2 gap-3" data-testid="hotel-enquiry-form">
          <input placeholder="Name" value={name} onChange={(e)=>setName(e.target.value)} className="px-3 py-2.5 rounded-lg border border-stone-300" data-testid="hotel-modal-name" />
          <input placeholder="Phone" value={phone} onChange={(e)=>setPhone(e.target.value)} className="px-3 py-2.5 rounded-lg border border-stone-300" data-testid="hotel-modal-phone" />
          <input type="date" value={checkin} onChange={(e)=>setCheckin(e.target.value)} className="px-3 py-2.5 rounded-lg border border-stone-300" data-testid="hotel-modal-checkin" />
          <input type="date" value={checkout} onChange={(e)=>setCheckout(e.target.value)} className="px-3 py-2.5 rounded-lg border border-stone-300" data-testid="hotel-modal-checkout" />
          <input type="number" min="1" value={guests} onChange={(e)=>setGuests(Number(e.target.value))} className="px-3 py-2.5 rounded-lg border border-stone-300" data-testid="hotel-modal-guests" />
          <button type="submit" disabled={submitting} data-testid="hotel-modal-submit" className="sm:col-span-2 py-3 rounded-full bg-[#C8860A] hover:bg-[#a86f08] text-white font-semibold disabled:opacity-60">
            {submitting ? "Sending..." : "Send Enquiry"}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
