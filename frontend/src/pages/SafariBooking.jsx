import { useEffect, useMemo, useState } from "react";
import PublicLayout from "@/components/PublicLayout";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { CheckCircle2, ChevronDown, Sunrise, Sunset, Minus, Plus, ArrowRight, AlertCircle } from "lucide-react";
import { api, waLink } from "@/lib/api";
import { SAFARI_HERO_IMG, SAFARI_PRICES, ZONES, SAFARI_TIMINGS } from "@/lib/content";

const STEP_LABELS = ["Date & Session", "Safari Details", "Visitor Details"];

// derive availability per date deterministically (no backend needed)
function getDateStatus(d) {
  if (!d) return "green";
  const day = d.getDay();
  // Wed: zones 1-5 closed; Tue: zones 6-10 closed (treat both as red/limited)
  if (day === 3) return "red"; // Wed
  if (day === 2) return "orange"; // Tue tatkal-only
  const seed = (d.getDate() + d.getMonth()) % 5;
  if (seed === 0) return "yellow";
  if (seed === 1) return "red";
  return "green";
}

export default function SafariBooking() {
  const [step, setStep] = useState(1);
  const [date, setDate] = useState(null);
  const [shift, setShift] = useState(null);
  const [vehicle, setVehicle] = useState(SAFARI_PRICES[2].value); // gypsy default
  const [zone, setZone] = useState("3");
  const [nationality, setNationality] = useState("Indian");
  const [guests, setGuests] = useState(2);
  const [chambal, setChambal] = useState(false);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [age, setAge] = useState("");
  const [idProofType, setIdProofType] = useState("");
  const [idProofNumber, setIdProofNumber] = useState("");
  const [emergencyName, setEmergencyName] = useState("");
  const [emergencyNumber, setEmergencyNumber] = useState("");

  const [success, setSuccess] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Tatkal
  const [tDate, setTDate] = useState("");
  const [tName, setTName] = useState("");
  const [tWa, setTWa] = useState("");
  const [tGuests, setTGuests] = useState(2);
  const [tSubmitting, setTSubmitting] = useState(false);

  const selectedPrice = useMemo(() => SAFARI_PRICES.find((p) => p.value === vehicle), [vehicle]);
  const perPerson = selectedPrice ? selectedPrice[nationality === "Indian" ? "indian" : "foreigner"] : 0;
  const isTotalPriced = selectedPrice?.total;
  const baseTotal = isTotalPriced ? perPerson : perPerson * guests;
  const addonTotal = chambal ? 800 * guests : 0;
  const total = baseTotal + addonTotal;

  useEffect(() => {
    if (window.location.hash === "#tatkal") {
      const el = document.getElementById("tatkal");
      if (el) el.scrollIntoView({ behavior: "smooth" });
    }
  }, []);

  function canProceed1() { return date && shift; }
  function canProceed2() { return vehicle && zone && guests > 0; }
  function canSubmit() { return fullName && email && whatsapp && idProofType && idProofNumber; }

  async function submitBooking() {
    if (!canSubmit()) {
      toast.error("Please complete all required visitor details.");
      return;
    }
    setSubmitting(true);
    try {
      const z = ZONES.find((zo) => String(zo.id) === String(zone));
      const payload = {
        date: date.toISOString().slice(0, 10),
        shift,
        vehicle: selectedPrice.type,
        zone: z ? `${z.id} — ${z.name}` : String(zone),
        nationality,
        guests,
        per_person: perPerson,
        total,
        addons: chambal ? ["Chambal River Safari"] : [],
        full_name: fullName,
        email,
        whatsapp,
        age: age ? Number(age) : null,
        id_proof_type: idProofType,
        id_proof_number: idProofNumber,
        emergency_contact_name: emergencyName,
        emergency_contact_number: emergencyNumber,
        is_tatkal: selectedPrice.tatkal || false,
      };
      const { data } = await api.post("/bookings", payload);
      setSuccess(data);
      toast.success("Booking request received!");
    } catch {
      toast.error("Could not submit booking. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function submitTatkal(e) {
    e.preventDefault();
    if (!tDate || !tName || !tWa) {
      toast.error("Please fill all Tatkal fields.");
      return;
    }
    setTSubmitting(true);
    try {
      await api.post("/inquiries", {
        type: "tatkal_request",
        name: tName,
        phone: tWa,
        message: `Tatkal request for ${tGuests} guest(s) on ${tDate}`,
        context: { date: tDate, guests: tGuests, summary: `Tatkal request · ${tGuests} guests · ${tDate}` },
      });
      const wa = waLink(`Tatkal request: ${tName}, ${tGuests} guests on ${tDate}. WhatsApp: ${tWa}`);
      window.open(wa, "_blank");
      toast.success("Tatkal request submitted!");
      setTDate(""); setTName(""); setTWa(""); setTGuests(2);
    } catch {
      toast.error("Could not submit Tatkal request.");
    } finally {
      setTSubmitting(false);
    }
  }

  // SUCCESS SCREEN
  if (success) {
    const ref = success.ref;
    const waMsg = waLink(`Hi! Booking ${ref}. Name: ${success.full_name}. Date: ${success.date} ${success.shift}. Vehicle: ${success.vehicle}. Zone: ${success.zone}. Guests: ${success.guests}. Total ₹${success.total}.`);
    return (
      <PublicLayout title="Booking Received | Ranthambore's Curator" description="Your safari booking request has been received.">
        <section className="min-h-[80vh] flex items-center justify-center px-6 py-24 bg-[#F9F5EE]">
          <div className="max-w-xl text-center bg-white rounded-3xl p-10 shadow-xl border border-stone-200">
            <div className="w-20 h-20 mx-auto rounded-full bg-green-100 flex items-center justify-center mb-6">
              <CheckCircle2 className="w-12 h-12 text-green-600" />
            </div>
            <h1 className="font-serif text-3xl font-bold mb-2">Request received!</h1>
            <p className="text-stone-600 mb-2">Our team will contact you on WhatsApp within 30 minutes to confirm your safari and share payment details.</p>
            <div className="my-6 p-4 rounded-xl bg-[#1A2B1F] text-white inline-block">
              <div className="text-xs uppercase tracking-wider text-[#C8860A]">Booking Reference</div>
              <div data-testid="booking-ref" className="font-serif text-2xl mt-1">{ref}</div>
            </div>
            <a
              data-testid="success-whatsapp"
              href={waMsg}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full mt-4 py-3.5 rounded-full bg-[#25D366] hover:bg-[#1ebe5b] text-white font-semibold transition-colors"
            >
              Continue on WhatsApp →
            </a>
          </div>
        </section>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout
      title="Book Ranthambore Safari Online — Jeep & Canter Safari | Ranthambore's Curator"
      description="Book Ranthambore Jeep Safari and Canter Safari online. Choose your zone, date and shift. WhatsApp confirmation in 30 minutes. Tatkal safari available."
    >
      {/* HERO */}
      <section className="relative -mt-[72px] pt-[72px] min-h-[60vh] flex items-center justify-center text-center text-white overflow-hidden">
        <img src={SAFARI_HERO_IMG} alt="Ranthambore Safari Jeep ready for tiger safari" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-[#C8860A]/40" />
        <div className="absolute inset-0 bg-black/30" />
        <div className="relative z-10 max-w-4xl px-6 py-20">
          <h1 className="font-serif font-bold text-4xl sm:text-5xl lg:text-6xl">Book Your Ranthambore Safari — Simple. Fast. Confirmed.</h1>
          <p className="mt-4 text-white/85 text-lg">Three quick steps and a real human reply on WhatsApp. No payment taken on this website.</p>
        </div>
      </section>

      {/* Zone closure alert */}
      <div className="bg-[#E63946]/10 border-y border-[#E63946]/30 text-[#9b1f29]">
        <div className="max-w-6xl mx-auto px-6 py-3 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <span><strong>Zone Closures:</strong> Zones 6–10 closed every Tuesday · Zones 1–5 closed every Wednesday</span>
        </div>
      </div>

      <section className="py-16 md:py-20 bg-[#F9F5EE]">
        <div className="max-w-6xl mx-auto px-5 md:px-6 grid lg:grid-cols-3 gap-8">
          {/* MAIN COLUMN */}
          <div className="lg:col-span-2 space-y-8">
            {/* Step indicator */}
            <div className="flex items-center justify-between" data-testid="booking-step-indicator">
              {STEP_LABELS.map((label, i) => {
                const n = i + 1;
                const active = step === n;
                const done = step > n;
                return (
                  <div key={n} className="flex-1 flex items-center">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${done ? "bg-green-600 text-white" : active ? "bg-[#C8860A] text-white" : "bg-stone-200 text-stone-500"}`}>{n}</div>
                    <span className={`ml-2 text-sm hidden sm:block ${active ? "font-semibold" : "text-stone-500"}`}>{label}</span>
                    {n < 3 && <div className={`flex-1 h-[2px] mx-3 ${done ? "bg-green-600" : "bg-stone-200"}`} />}
                  </div>
                );
              })}
            </div>

            {/* STEP 1 */}
            {step === 1 && (
              <div className="bg-white rounded-2xl p-6 md:p-8 border border-stone-200 shadow-sm">
                <h2 className="font-serif text-2xl mb-2">Pick Your Date & Session</h2>
                <p className="text-sm text-stone-600 mb-5">
                  <span className="inline-flex items-center gap-1 mr-3"><span className="w-2 h-2 rounded-full bg-green-500" /> Available</span>
                  <span className="inline-flex items-center gap-1 mr-3"><span className="w-2 h-2 rounded-full bg-yellow-500" /> Limited</span>
                  <span className="inline-flex items-center gap-1 mr-3"><span className="w-2 h-2 rounded-full bg-red-500" /> Fully Booked</span>
                  <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500" /> Tatkal Only</span>
                </p>
                <div className="grid md:grid-cols-2 gap-6 items-start">
                  <div data-testid="booking-calendar">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={setDate}
                      disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                      modifiers={{
                        green: (d) => getDateStatus(d) === "green",
                        yellow: (d) => getDateStatus(d) === "yellow",
                        red: (d) => getDateStatus(d) === "red",
                        orange: (d) => getDateStatus(d) === "orange",
                      }}
                      modifiersStyles={{
                        green: { backgroundColor: "#dcfce7", color: "#166534" },
                        yellow: { backgroundColor: "#fef9c3", color: "#854d0e" },
                        red: { backgroundColor: "#fee2e2", color: "#991b1b" },
                        orange: { backgroundColor: "#ffedd5", color: "#9a3412" },
                      }}
                      className="rounded-md border"
                    />
                  </div>
                  <div className="space-y-3">
                    <button
                      data-testid="shift-morning"
                      onClick={() => setShift("morning")}
                      className={`w-full text-left p-4 rounded-xl border transition-all ${shift === "morning" ? "border-[#C8860A] bg-[#C8860A]/10" : "border-stone-200 hover:border-[#C8860A]/50"}`}
                    >
                      <div className="flex items-center gap-3">
                        <Sunrise className="w-6 h-6 text-[#C8860A]" />
                        <div>
                          <div className="font-semibold">Morning Safari</div>
                          <div className="text-xs text-stone-600">6:00 – 10:30 AM (varies by season)</div>
                        </div>
                      </div>
                    </button>
                    <button
                      data-testid="shift-evening"
                      onClick={() => setShift("evening")}
                      className={`w-full text-left p-4 rounded-xl border transition-all ${shift === "evening" ? "border-[#C8860A] bg-[#C8860A]/10" : "border-stone-200 hover:border-[#C8860A]/50"}`}
                    >
                      <div className="flex items-center gap-3">
                        <Sunset className="w-6 h-6 text-[#C8860A]" />
                        <div>
                          <div className="font-semibold">Evening Safari</div>
                          <div className="text-xs text-stone-600">2:00 – 7:00 PM (varies by season)</div>
                        </div>
                      </div>
                    </button>
                  </div>
                </div>
                <div className="flex justify-end mt-6">
                  <button
                    data-testid="step1-continue"
                    onClick={() => canProceed1() ? setStep(2) : toast.error("Select a date and session")}
                    disabled={!canProceed1()}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#C8860A] hover:bg-[#a86f08] text-white font-semibold disabled:opacity-50"
                  >
                    Continue <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2 */}
            {step === 2 && (
              <div className="bg-white rounded-2xl p-6 md:p-8 border border-stone-200 shadow-sm space-y-6">
                <h2 className="font-serif text-2xl">Safari Details</h2>

                <div>
                  <div className="text-sm font-medium mb-2">Vehicle Type</div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {SAFARI_PRICES.map((p) => (
                      <button
                        key={p.value}
                        data-testid={`vehicle-${p.value}`}
                        onClick={() => setVehicle(p.value)}
                        className={`text-left p-4 rounded-xl border transition-all ${vehicle === p.value ? "border-[#C8860A] bg-[#C8860A]/10" : "border-stone-200 hover:border-[#C8860A]/50"}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="font-semibold">{p.type}</div>
                          {p.tatkal && <span className="text-[10px] uppercase tracking-wider bg-[#E63946]/10 text-[#E63946] px-2 py-0.5 rounded-full">Tatkal</span>}
                        </div>
                        <div className="text-xs text-stone-600 mt-1">{p.sub}</div>
                        <div className="mt-2 text-sm">
                          IN ₹{p.indian.toLocaleString("en-IN")}{p.total ? " total" : "/person"} · FR ₹{p.foreigner.toLocaleString("en-IN")}{p.total ? " total" : "/person"}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium block mb-2">Zone</label>
                    <Select value={zone} onValueChange={setZone}>
                      <SelectTrigger data-testid="zone-select" className="w-full"><SelectValue placeholder="Choose a zone" /></SelectTrigger>
                      <SelectContent>
                        {ZONES.map((z) => (
                          <SelectItem key={z.id} value={String(z.id)}>Zone {z.id} — {z.name} ({z.wildlife})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium block mb-2">Nationality</label>
                    <div className="flex gap-2">
                      {["Indian", "Foreigner"].map((n) => (
                        <button
                          key={n}
                          data-testid={`nationality-${n.toLowerCase()}`}
                          onClick={() => setNationality(n)}
                          className={`flex-1 py-2.5 rounded-full border text-sm ${nationality === n ? "bg-[#1A2B1F] text-white border-[#1A2B1F]" : "border-stone-300 hover:border-[#1A2B1F]"}`}
                        >{n}</button>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium block mb-2">Guests</label>
                  <div className="inline-flex items-center gap-3 border rounded-full px-2 py-1 border-stone-300">
                    <button data-testid="guests-minus" onClick={() => setGuests(Math.max(1, guests - 1))} className="w-8 h-8 rounded-full border border-stone-300 hover:border-[#C8860A] flex items-center justify-center"><Minus className="w-4 h-4" /></button>
                    <span className="w-8 text-center font-semibold" data-testid="guests-count">{guests}</span>
                    <button data-testid="guests-plus" onClick={() => setGuests(guests + 1)} className="w-8 h-8 rounded-full border border-stone-300 hover:border-[#C8860A] flex items-center justify-center"><Plus className="w-4 h-4" /></button>
                  </div>
                </div>

                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={chambal} onCheckedChange={setChambal} data-testid="addon-chambal" />
                  Add Chambal River Safari (+₹800/person)
                </label>

                <div className="flex justify-between">
                  <button onClick={() => setStep(1)} className="text-sm text-stone-600 hover:text-[#C8860A]">← Back</button>
                  <button
                    data-testid="step2-continue"
                    onClick={() => canProceed2() ? setStep(3) : toast.error("Complete safari details")}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#C8860A] hover:bg-[#a86f08] text-white font-semibold"
                  >Continue <ArrowRight className="w-4 h-4" /></button>
                </div>
              </div>
            )}

            {/* STEP 3 */}
            {step === 3 && (
              <div className="bg-white rounded-2xl p-6 md:p-8 border border-stone-200 shadow-sm space-y-4">
                <h2 className="font-serif text-2xl">Visitor Details</h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  <input data-testid="visitor-name" placeholder="Full Name" value={fullName} onChange={(e)=>setFullName(e.target.value)} className="px-3 py-2.5 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-[#C8860A]/40" />
                  <input data-testid="visitor-email" type="email" placeholder="Email" value={email} onChange={(e)=>setEmail(e.target.value)} className="px-3 py-2.5 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-[#C8860A]/40" />
                  <input data-testid="visitor-whatsapp" placeholder="WhatsApp Number" value={whatsapp} onChange={(e)=>setWhatsapp(e.target.value)} className="px-3 py-2.5 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-[#C8860A]/40" />
                  <input data-testid="visitor-age" type="number" placeholder="Age" value={age} onChange={(e)=>setAge(e.target.value)} className="px-3 py-2.5 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-[#C8860A]/40" />
                  <Select value={idProofType} onValueChange={setIdProofType}>
                    <SelectTrigger data-testid="id-proof-type"><SelectValue placeholder="ID Proof Type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Aadhaar">Aadhaar</SelectItem>
                      <SelectItem value="Passport">Passport</SelectItem>
                      <SelectItem value="Driving License">Driving License</SelectItem>
                      <SelectItem value="PAN">PAN</SelectItem>
                      <SelectItem value="Voter ID">Voter ID</SelectItem>
                    </SelectContent>
                  </Select>
                  <input data-testid="id-proof-number" placeholder="ID Proof Number" value={idProofNumber} onChange={(e)=>setIdProofNumber(e.target.value)} className="px-3 py-2.5 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-[#C8860A]/40" />
                  <input placeholder="Emergency Contact Name" value={emergencyName} onChange={(e)=>setEmergencyName(e.target.value)} className="px-3 py-2.5 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-[#C8860A]/40" />
                  <input placeholder="Emergency Contact Number" value={emergencyNumber} onChange={(e)=>setEmergencyNumber(e.target.value)} className="px-3 py-2.5 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-[#C8860A]/40" />
                </div>
                <div className="flex justify-between pt-2">
                  <button onClick={() => setStep(2)} className="text-sm text-stone-600 hover:text-[#C8860A]">← Back</button>
                  <button
                    data-testid="submit-booking"
                    onClick={submitBooking}
                    disabled={submitting}
                    className="inline-flex items-center gap-2 px-7 py-3 rounded-full bg-[#C8860A] hover:bg-[#a86f08] text-white font-semibold disabled:opacity-60"
                  >{submitting ? "Submitting..." : "Submit Booking"} <ArrowRight className="w-4 h-4" /></button>
                </div>
                <p className="text-xs text-stone-500">No payment taken on this website. Our team confirms on WhatsApp within 30 minutes.</p>
              </div>
            )}

            {/* SAFARI TIMINGS */}
            <Collapsible className="bg-white rounded-2xl border border-stone-200 p-6">
              <CollapsibleTrigger data-testid="timings-toggle" className="flex w-full justify-between items-center text-left font-serif text-lg">
                Safari Timings (by Season)
                <ChevronDown className="w-5 h-5" />
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-black text-white">
                      <tr>
                        <th className="px-4 py-3 text-left">Months</th>
                        <th className="px-4 py-3 text-left">Morning Shift</th>
                        <th className="px-4 py-3 text-left">Evening Shift</th>
                      </tr>
                    </thead>
                    <tbody>
                      {SAFARI_TIMINGS.map((t, i) => (
                        <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-[#F5F5F5]"}>
                          <td className="px-4 py-3">{t.months}</td>
                          <td className="px-4 py-3">{t.morning}</td>
                          <td className="px-4 py-3">{t.evening}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>

          {/* STICKY PRICE PANEL */}
          <aside className="lg:sticky lg:top-24 self-start">
            <div data-testid="price-panel" className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6 space-y-3">
              <h3 className="font-serif text-xl">Your Safari</h3>
              <Row k="Date" v={date ? date.toLocaleDateString() : "—"} />
              <Row k="Shift" v={shift ? shift[0].toUpperCase() + shift.slice(1) : "—"} />
              <Row k="Vehicle" v={selectedPrice?.type || "—"} />
              <Row k="Zone" v={ZONES.find(z => String(z.id) === String(zone))?.name || "—"} />
              <Row k="Guests" v={guests} />
              <Row k="Per Person" v={isTotalPriced ? `₹${perPerson.toLocaleString("en-IN")} total` : `₹${perPerson.toLocaleString("en-IN")}`} />
              {chambal && <Row k="Chambal Add-on" v={`₹${(800 * guests).toLocaleString("en-IN")}`} />}
              <div className="border-t border-stone-200 pt-3 flex justify-between font-bold text-lg">
                <span>Total</span><span data-testid="price-total">₹{total.toLocaleString("en-IN")}</span>
              </div>
              <p className="text-xs text-stone-500">No payment taken here. Our team confirms on WhatsApp.</p>
            </div>
          </aside>
        </div>
      </section>

      {/* TATKAL */}
      <section id="tatkal" className="py-20 md:py-24 bg-[#1A2B1F] text-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-10">
            <span className="inline-block text-xs tracking-[0.3em] uppercase text-[#E63946] mb-3 bg-[#E63946]/10 px-3 py-1 rounded-full border border-[#E63946]/40">URGENT · Tatkal Safari</span>
            <h2 className="font-serif text-3xl sm:text-5xl font-bold">Same-Day Safari — Tatkal Booking</h2>
            <p className="mt-3 text-white/75 max-w-2xl mx-auto">The forest department releases Tatkal seats exactly one day before each safari at 9:30 AM. These are the only seats available for today or tomorrow bookings.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-5 mb-10">
            {[
              { t: "Window Opens", d: "9:30 AM sharp, one day before safari" },
              { t: "Higher Pricing", d: "Tatkal carries premium government fees" },
              { t: "We Monitor It", d: "We grab your seat the second it opens" },
            ].map((c, i) => (
              <div key={i} className="bg-black/30 rounded-2xl p-6 border border-white/10">
                <div className="text-[#C8860A] uppercase text-xs tracking-widest mb-2">{c.t}</div>
                <p className="text-white/85 text-sm">{c.d}</p>
              </div>
            ))}
          </div>
          <div className="grid md:grid-cols-2 gap-8 items-start">
            <div className="bg-black/30 rounded-2xl p-6 border border-white/10">
              <h3 className="font-serif text-xl mb-3">Tatkal Pricing</h3>
              <div className="text-sm space-y-2">
                <div className="flex justify-between"><span>Tatkal Gypsy — Indian</span><span className="font-semibold">₹30,000 total</span></div>
                <div className="flex justify-between"><span>Tatkal Gypsy — Foreign</span><span className="font-semibold">₹45,000 total</span></div>
              </div>
              <p className="text-xs text-white/60 mt-4">VIP Safari · 6-seater open Gypsy · zone allocated on the day.</p>
            </div>
            <form onSubmit={submitTatkal} className="bg-white text-[#1C1C1C] rounded-2xl p-6 space-y-3" data-testid="tatkal-form">
              <h3 className="font-serif text-xl">Tatkal Request</h3>
              <input type="date" data-testid="tatkal-date" value={tDate} onChange={(e)=>setTDate(e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-stone-300" />
              <input data-testid="tatkal-name" placeholder="Your Name" value={tName} onChange={(e)=>setTName(e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-stone-300" />
              <input data-testid="tatkal-whatsapp" placeholder="WhatsApp Number" value={tWa} onChange={(e)=>setTWa(e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-stone-300" />
              <input data-testid="tatkal-guests" type="number" min="1" placeholder="Number of Guests" value={tGuests} onChange={(e)=>setTGuests(Number(e.target.value))} className="w-full px-3 py-2.5 rounded-lg border border-stone-300" />
              <button
                type="submit"
                data-testid="tatkal-submit"
                disabled={tSubmitting}
                className="tatkal-blink w-full mt-2 py-3.5 rounded-full bg-[#E63946] text-white font-bold uppercase tracking-wider text-sm disabled:opacity-60"
              >{tSubmitting ? "Submitting..." : "Submit Tatkal Request Now"}</button>
            </form>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}

function Row({ k, v }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-stone-500">{k}</span>
      <span className="font-medium">{v}</span>
    </div>
  );
}
