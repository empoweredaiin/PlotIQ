import { ChevronDown } from 'lucide-react';
import { SectionTitle } from '../shared/primitives';

const faqs = [
  {
    q: 'Why 15% incentive BUA?',
    a: "Reg 33(7)(B) provides \"incentive additional BUA\" of 15% of existing BUA OR 10 sqm per residential tenement, whichever is greater — without premium. The government's way of incentivising old buildings to redevelop, by giving free FSI to the existing society. Exact split between members and developer is decided by your General Body resolution.",
  },
  {
    q: 'What is FSI? What is BUA?',
    a: 'FSI (Floor Space Index) is a multiplier on plot area that tells you how much you can build. BUA (Built-Up Area) is the actual square metres of construction. If your plot is 1,000 sqm and FSI is 2, you can build 2,000 sqm of BUA. Carpet area is the usable area inside flats — typically 70-80% of BUA after walls and common areas.',
  },
  {
    q: 'How does the FSI build-up work?',
    a: 'Reg 30 / Table 12 sets four levels: Base FSI (free, depends on location and road width), Premium FSI (extra, by paying MCGM), TDR loading (extra, by buying TDR), and the maximum permissible at the top. Your society first computes Existing + 15% Incentive — if that exceeds Base alone, you get that. If you also pay premium and/or buy TDR, you can go up to the maximum.',
  },
  {
    q: 'What is "rehab" vs "sale" component?',
    a: 'Rehab = area allocated to existing society members in the new building. Sale = area the developer can sell to outsiders to monetise the project. The sale component is what makes redevelopment commercially viable for a developer.',
  },
  {
    q: 'What is Premium FSI?',
    a: 'FSI you can buy from MCGM by paying a premium of 50% of the ASR land rate per Reg 30(A)(6). The temporary 50% rebate under GR 14.01.2021 (which made it effectively 25%) has expired. The Realistic scenario assumes premium FSI is purchased.',
  },
  {
    q: 'What is TDR?',
    a: "Transferable Development Rights — FSI generated when someone surrenders land elsewhere (typically for road widening or slum redev) and traded as a certificate. Buying TDR is an alternative to paying premium. Whether it's cheaper depends on TDR market price at the time.",
  },
  {
    q: 'What is Fungible Compensatory Area?',
    a: 'Reg 31(3) — an additional 35% of FSI BUA (residential) you can avail by paying premium. Originally introduced in DCPR 2034 to absorb things that were earlier free of FSI (flowerbeds, niches, etc.).',
  },
  {
    q: 'My building is 28 years old. What can I do?',
    a: 'Three options. (1) Wait two years to qualify under 33(7)(B). (2) If structurally distressed, get a structural audit and pursue 33(7)(A) which has higher incentives. (3) Combine with neighbouring societies under 33(9) cluster scheme.',
  },
];

export default function Explainers() {
  return (
    <div style={{ marginBottom: 32 }}>
      <SectionTitle eyebrow="Plain-English explanations" title="What does all this mean?">
        For members reading this in a committee group. No regulatory jargon.
      </SectionTitle>
      <div style={{ background: '#13161D', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 4 }}>
        {faqs.map((faq, i) => (
          <details key={i} style={{ borderBottom: i < faqs.length - 1 ? '1px solid rgba(255,255,255,0.07)' : 'none' }}>
            <summary style={{ padding: 16, display: 'flex', justifyContent: 'space-between',
                              alignItems: 'center', gap: 12 }}>
              <div className="serif" style={{ fontSize: 15, fontWeight: 500, color: 'var(--ink)' }}>{faq.q}</div>
              <ChevronDown size={14} color="rgba(255,255,255,0.35)" />
            </summary>
            <div style={{ padding: '0 16px 16px 16px', fontSize: 13,
                          color: 'var(--ink-soft)', lineHeight: 1.65, maxWidth: 720 }}>
              {faq.a}
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
