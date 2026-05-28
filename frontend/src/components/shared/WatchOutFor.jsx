import { AlertTriangle, ChevronDown } from 'lucide-react';
import { SectionTitle } from './primitives';

export default function WatchOutFor({ result }) {
  const items = [
    {
      title: 'Developer claims you can only get "1.2× existing carpet"',
      response: `Under 33(7)(B), the incentive BUA is at minimum 15% of total existing BUA, OR 10 sqm per residential flat (whichever is higher) — that's free. Beyond that, the regulation also allows your society to access premium FSI and TDR up to the Table 12 ceiling. A flat 1.2× offer is the developer's negotiation position, not the regulation.`,
    },
    {
      title: 'Developer says "TDR is not available" or "TDR is too expensive"',
      response: `TDR is available in Mumbai and is actively traded. Whether it makes commercial sense depends on TDR market price vs. ASR rates at your location. If a developer rules it out, ask them to show you the TDR market quote they used. The Maximum scenario assumes TDR is loaded; if not, the Realistic scenario still applies.`,
    },
    {
      title: 'Developer asks the society to pay any premium',
      response: `Under 33(7)(B), the incentive BUA portion is free of premium. Premium that's payable goes to MCGM, not the developer, and applies only to the Premium FSI portion above existing+incentive. Standard practice: developer pays this premium from sale-component proceeds. If a developer asks the society to pay premium, that's a major red flag.`,
    },
    {
      title: "Developer offers area X but won't show the area statement",
      response: `Always ask for a written area statement (like the one in this report) showing: existing BUA, incentive BUA, FSI build-up, fungible, rehab to members, sale to developer. Reputable developers and their architects produce this routinely. Refusal to show is itself information.`,
    },
    {
      title: 'Developer commits to corpus of ₹X lakhs per flat without showing the maths',
      response: `Corpus, rent during construction, and other monetary payments are negotiated and not regulated by the DCPR. Reasonable benchmarks come from comparable society redevs in your micro-market. Get at least 3 developer offers and compare corpus + rent + carpet + finishing schedule together — not corpus alone.`,
    },
    {
      title: 'Past FSI claims on the same plot for road/reservation area (Reg 30(A)(2) Note 2)',
      response: `If your society or a previous owner has ALREADY claimed FSI/TDR benefit for any road/DP-road/reservation area on this plot in an earlier development proposal, but the title has not yet transferred to MCGM — Reg 30(A)(2) Note 2 says that area is STILL deducted from your plot for FSI computation now (you cannot "double-claim" it). Ask your architect to check past sanctioned proposals on the property card. If found, reduce your "DP road set-back" / "DP reservation" input accordingly — those parts are spent FSI.`,
    },
    {
      title: 'Developer adds "in-situ FSI for road/reservation handover" to your 33(7)(B) area',
      response: `Reg 16 explicitly EXCLUDES 33(5), 33(7), 33(7)(A), 33(9), 33(9)(A), 33(9)(B), 33(10), 33(10)(A), 33(20)(A), 33(21) from earning in-lieu FSI/TDR for road or reservation area handed over. The incentive BUA you already get under 33(7)(B) is treated as covering this. If a developer's area statement shows an "in-situ FSI" or "FSI in lieu of road land" line under your 33(7)(B) calculation, that's likely a double-count.`,
    },
    result.viabilityRatio < 0.4 ? {
      title: 'No developer is interested or all want money from the society',
      response: `Your sale-to-rehab ratio is low — this isn't a developer trick, it's a real constraint. Options: (a) wait for higher FSI policies, (b) explore Reg 33(9) cluster scheme by combining with neighbouring societies, (c) check if 33(7)(A) applies if any structural distress, (d) consider self-redevelopment with a society loan.`,
    } : null,
  ].filter(Boolean);

  return (
    <div style={{ marginBottom: 32 }}>
      <SectionTitle eyebrow="Critical reading" title="What to watch for in developer conversations">
        Common moves that compress the value the regulation actually entitles you to.
      </SectionTitle>

      <div style={{ display: 'grid', gap: 10 }}>
        {items.map((item, i) => (
          <details key={i} style={{ background: '#13161D', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 4 }}>
            <summary style={{ padding: 16, display: 'flex', justifyContent: 'space-between',
                              alignItems: 'center', gap: 12 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', flex: 1 }}>
                <AlertTriangle size={16} color="#C9A96E" style={{ flexShrink: 0 }} />
                <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--ink)' }}>{item.title}</div>
              </div>
              <ChevronDown size={14} color="rgba(255,255,255,0.35)" />
            </summary>
            <div style={{ padding: '0 16px 16px 44px', fontSize: 13,
                          color: 'var(--ink-soft)', lineHeight: 1.6 }}>
              {item.response}
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
