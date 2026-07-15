import Link from 'next/link';
import type { Metadata } from 'next';
import HomeAuthGate from '@/components/HomeAuthGate';

// Home page pubblica di JOBBY (marketing landing).
// NOTA: questa route sostituisce il vecchio selector di ruolo su "/".
// Il selector di ruolo per utenti "both" è stato spostato su /select-role
// (vedi app/select-role/page.tsx). Un utente già loggato che arriva qui
// viene rimandato alla sua area da <HomeAuthGate /> (client-side, non
// blocca il render lato server della pagina).

export const metadata: Metadata = {
  title: 'JOBBY — Il tuo tempo, le tue opportunità',
  description: 'JOBBY collega chi cerca aiuto con chi ha tempo ed esperienza da offrire: pulizie, babysitting, riparazioni e molto altro, con identità verificata e pagamenti sicuri.',
};

export default function HomePage() {
  return (
    <>
      <style>{css}</style>
      <HomeAuthGate />

      {/* NAV */}
      <nav className="nav">
        <div className="nav-inner">
          <a className="nav-brand" href="#top">
            <img src="/assets/jobby-icon.png" alt="JOBBY" />
            <span>JOB<b>BY</b></span>
          </a>
          <div className="nav-links">
            <a href="#come-funziona">Come funziona</a>
            <a href="#categorie">Categorie</a>
            <a href="#fiducia">Sicurezza &amp; Fiducia</a>
            <a href="#per-provider">Per i Provider</a>
          </div>
          <div className="nav-cta">
            <Link className="btn btn-ghost" href="/login">Accedi</Link>
            <Link className="btn btn-solid" href="/register">Registrati</Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <header className="hero" id="top">
        <div className="hero-inner">
          <div>
            <div className="hero-eyebrow">The Time Economy Platform</div>
            <h1>Il tuo tempo<br />ha <em>valore.</em></h1>
            <p className="sub">JOBBY collega chi cerca aiuto con chi ha tempo ed esperienza da offrire — pulizie, babysitting, riparazioni e molto altro, con identità verificata e pagamenti sicuri.</p>
            <div className="hero-cta">
              <Link className="btn btn-orange btn-lg" href="/register?role=client">Ho bisogno di un servizio</Link>
              <Link className="btn btn-ghost btn-lg" style={{ borderColor: 'rgba(255,255,255,0.2)', color: '#fff' }} href="/register?role=provider">Voglio offrire il mio tempo</Link>
            </div>
            <div className="hero-trust">
              <div className="ht-item"><div className="ht-dot"></div>Identità verificata Sumsub KYC</div>
              <div className="ht-item"><div className="ht-dot"></div>Pagamenti in escrow</div>
              <div className="ht-item"><div className="ht-dot"></div>Trust Score™ trasparente</div>
            </div>
          </div>
          <div className="hero-art">
            <div className="hero-logo-card">
              <img src="/assets/jobby-logo.png" alt="Logo JOBBY — il tuo tempo, le tue opportunità" />
            </div>
          </div>
        </div>

        <div className="stat-strip">
          <div className="stat-inner">
            <div className="stat"><div className="num">26</div><div className="lbl">Categorie di servizio</div></div>
            <div className="stat"><div className="num">100%</div><div className="lbl">Provider verificati KYC</div></div>
            <div className="stat"><div className="num">&lt; 5 min</div><div className="lbl">Tempo medio di matching</div></div>
            <div className="stat"><div className="num">24/7</div><div className="lbl">Assistenza e garanzia JOBBY</div></div>
          </div>
        </div>
      </header>

      {/* ROLE PICKER */}
      <section className="roles" id="per-provider">
        <div className="wrap">
          <div className="section-head">
            <div className="eyebrow"><span className="dot"></span>Due modi di usare JOBBY</div>
            <h2>Scegli il tuo ruolo</h2>
            <p>Puoi essere cliente, provider — o entrambi. Cambi ruolo in qualsiasi momento dal tuo profilo.</p>
          </div>
          <div className="role-cards">
            <div className="role-card client">
              <div className="rc-icon">🔍</div>
              <h3>Sono un Cliente</h3>
              <p>Trova aiuto vicino a te in pochi minuti: pulizie, babysitting, manutenzioni, consegne e attività di prossimità.</p>
              <ul className="rc-list">
                <li>Provider verificati e geolocalizzati</li>
                <li>Prezzi chiari dal listino del provider</li>
                <li>Chat e pagamento sicuro in-app</li>
              </ul>
              <Link className="rc-cta" href="/register?role=client">Trova un provider →</Link>
            </div>
            <div className="role-card provider">
              <div className="rc-icon">💼</div>
              <h3>Sono un Provider</h3>
              <p>Trasforma il tuo tempo libero in reddito. Scegli le categorie, imposta il tuo listino e la tua disponibilità.</p>
              <ul className="rc-list">
                <li>Missioni vicino a te, in tempo reale</li>
                <li>Trust Score™ per farti notare di più</li>
                <li>Guadagni protetti da pagamento in escrow</li>
              </ul>
              <Link className="rc-cta" href="/register?role=provider">Inizia a guadagnare →</Link>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="how" id="come-funziona">
        <div className="wrap">
          <div className="section-head">
            <div className="eyebrow"><span className="dot"></span>Semplice, veloce, sicuro</div>
            <h2>Come funziona</h2>
            <p>Dalla richiesta alla missione completata, in tre passaggi.</p>
          </div>
          <div className="how-grid">
            <div className="how-card">
              <div className="how-num">01</div>
              <h4>Racconta cosa ti serve</h4>
              <p>Scegli una categoria, rispondi a poche domande mirate e indica dove e quando ti serve aiuto.</p>
            </div>
            <div className="how-card">
              <div className="how-num">02</div>
              <h4>Scegli il provider giusto</h4>
              <p>Vedi i provider disponibili vicino a te con Trust Score, listino prezzi e recensioni — oppure lascia che JOBBY li proponga.</p>
            </div>
            <div className="how-card">
              <div className="how-num">03</div>
              <h4>Missione, pagamento, recensione</h4>
              <p>Chatta, conferma l&apos;arrivo, paga in sicurezza dall&apos;app e lascia una recensione al termine.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="cats" id="categorie">
        <div className="wrap">
          <div className="section-head">
            <div className="eyebrow"><span className="dot"></span>Cosa puoi trovare</div>
            <h2>Un provider per ogni esigenza</h2>
            <p>26 categorie tra servizi a domicilio e attività di prossimità vicino a te.</p>
          </div>
          <div className="cat-grid">
            <div className="cat-chip"><div className="ic">🧹</div><div className="lb">Pulizie</div></div>
            <div className="cat-chip"><div className="ic">👶</div><div className="lb">Babysitting</div></div>
            <div className="cat-chip"><div className="ic">🐾</div><div className="lb">Pet Sitting</div></div>
            <div className="cat-chip"><div className="ic">🔧</div><div className="lb">Tuttofare</div></div>
            <div className="cat-chip"><div className="ic">🍽️</div><div className="lb">Hospitality</div></div>
            <div className="cat-chip"><div className="ic">🚗</div><div className="lb">Driver</div></div>
            <div className="cat-chip"><div className="ic">❤️</div><div className="lb">Assistenza</div></div>
            <div className="cat-chip"><div className="ic">💻</div><div className="lb">Tecnico</div></div>
            <div className="cat-chip"><div className="ic">🪡</div><div className="lb">Sarta</div></div>
            <div className="cat-chip"><div className="ic">🍕</div><div className="lb">Food Delivery</div></div>
            <div className="cat-chip"><div className="ic">💐</div><div className="lb">Fioreria</div></div>
            <div className="cat-chip"><div className="ic">⚡</div><div className="lb">Elettricista</div></div>
          </div>
          <div className="cats-more">Più altre 14 categorie disponibili — <Link href="/register">esplora tutte le categorie →</Link></div>
        </div>
      </section>

      {/* TRUST */}
      <section className="trust" id="fiducia">
        <div className="wrap trust-inner">
          <div>
            <div className="eyebrow" style={{ color: 'rgba(255,255,255,0.45)' }}><span className="dot"></span>Sicurezza prima di tutto</div>
            <h2>Fiducia, verificata davvero</h2>
            <p className="lead">Ogni missione JOBBY è protetta da identità verificata, pagamenti in escrow e un punteggio di fiducia trasparente costruito nel tempo.</p>
          </div>
          <div className="trust-feats">
            <div className="tf">
              <div className="tf-ic">🪪</div>
              <div><div className="tf-t">Identità verificata KYC</div><div className="tf-s">Documento e selfie verificati con infrastruttura Sumsub prima di poter operare come provider.</div></div>
            </div>
            <div className="tf">
              <div className="tf-ic">🔒</div>
              <div><div className="tf-t">Pagamenti in escrow</div><div className="tf-s">L&apos;importo viene trattenuto in sicurezza e rilasciato al provider solo a missione completata.</div></div>
            </div>
            <div className="tf">
              <div className="tf-ic">⭐</div>
              <div><div className="tf-t">Trust Score™ multidimensionale</div><div className="tf-s">Puntualità, qualità, comunicazione e affidabilità: un punteggio costruito su ogni missione reale.</div></div>
            </div>
            <div className="tf">
              <div className="tf-ic">🛡️</div>
              <div><div className="tf-t">Garanzia JOBBY</div><div className="tf-s">Un problema con una missione? Il team di supporto e il centro dispute intervengono per risolverlo.</div></div>
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="final">
        <div className="wrap">
          <div className="eyebrow" style={{ justifyContent: 'center', display: 'flex' }}><span className="dot"></span>Pronto a iniziare?</div>
          <h2>Il tuo tempo, le tue opportunità. Da oggi.</h2>
          <p>Bastano due minuti per creare un account — come cliente, come provider, o entrambi.</p>
          <div className="final-cta">
            <Link className="btn btn-orange btn-lg" href="/register">Crea il tuo account gratis</Link>
            <Link className="btn btn-ghost btn-lg" href="/login">Ho già un account</Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer>
        <div className="wrap">
          <div className="foot-grid">
            <div>
              <a className="foot-brand" href="#top">
                <img src="/assets/jobby-icon.png" alt="JOBBY" />
                <span>JOB<b>BY</b></span>
              </a>
              <p className="foot-tag">La piattaforma della time economy: trova aiuto o trasforma il tuo tempo in reddito, con fiducia verificata.</p>
            </div>
            <div className="foot-col">
              <h5>Prodotto</h5>
              <a href="#come-funziona">Come funziona</a>
              <a href="#categorie">Categorie</a>
              <a href="#fiducia">Sicurezza &amp; Fiducia</a>
            </div>
            <div className="foot-col">
              <h5>Account</h5>
              <Link href="/login">Accedi</Link>
              <Link href="/register?role=client">Registrati come Cliente</Link>
              <Link href="/register?role=provider">Registrati come Provider</Link>
            </div>
            <div className="foot-col">
              <h5>Legale</h5>
              <a href="#">Privacy</a>
              <a href="#">Termini di servizio</a>
              <a href="#">Centro assistenza</a>
            </div>
          </div>
          <div className="foot-bottom">
            <span>© 2026 JOBBY. Tutti i diritti riservati.</span>
            <span>Milano, Italia</span>
          </div>
        </div>
      </footer>
    </>
  );
}

const css = `
*{margin:0;padding:0;box-sizing:border-box}
:root{
  --j:#FF5C35;--jl:#FFF0EC;
  --js:#1D9E75;--jsl:#E1F5EE;
  --jb:#185FA5;--jbl:#E6F1FB;
  --navy:#0A0F1E;
  --black:#0A0A0A;--white:#FAFAF8;--gray:#6B6B6B;--light:#F2F0EB;--border:#E0DDD6;
}
html{scroll-behavior:smooth}
body{font-family:'Inter',sans-serif;background:var(--white);color:var(--black);line-height:1.5;overflow-x:hidden}
a{text-decoration:none;color:inherit}
img{display:block;max-width:100%}
.wrap{max-width:1160px;margin:0 auto;padding:0 32px}
h1,h2,h3{font-family:'Sora',sans-serif;letter-spacing:-0.5px}
.eyebrow{display:inline-flex;align-items:center;gap:8px;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;font-weight:600;color:var(--gray);margin-bottom:16px}
.eyebrow .dot{width:6px;height:6px;border-radius:50%;background:var(--j)}

.nav{position:sticky;top:0;z-index:50;background:rgba(250,250,248,0.85);backdrop-filter:blur(10px);border-bottom:1px solid var(--border)}
.nav-inner{max-width:1160px;margin:0 auto;padding:14px 32px;display:flex;align-items:center;justify-content:space-between}
.nav-brand{display:flex;align-items:center;gap:9px}
.nav-brand img{height:30px;width:30px;object-fit:contain}
.nav-brand span{font-family:'Sora',sans-serif;font-size:18px;font-weight:700;letter-spacing:-0.3px}
.nav-brand b{color:var(--j)}
.nav-links{display:flex;align-items:center;gap:30px}
.nav-links a{font-size:13px;font-weight:500;color:var(--black);opacity:0.7;transition:opacity .15s}
.nav-links a:hover{opacity:1}
.nav-cta{display:flex;align-items:center;gap:10px}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:10px 20px;border-radius:100px;font-size:13px;font-weight:600;cursor:pointer;border:1.5px solid transparent;transition:all .15s;font-family:'Inter',sans-serif;white-space:nowrap}
.btn-ghost{color:var(--black);border-color:var(--border);background:transparent}
.btn-ghost:hover{background:var(--light)}
.btn-solid{background:var(--navy);color:#fff}
.btn-solid:hover{opacity:.88}
.btn-orange{background:var(--j);color:#fff}
.btn-orange:hover{opacity:.9}

.hero{position:relative;background:var(--navy);color:#fff;overflow:hidden;padding:64px 0 0}
.hero::before{content:'';position:absolute;top:-200px;left:50%;transform:translateX(-50%);width:900px;height:600px;background:radial-gradient(ellipse at center, rgba(29,158,117,0.28) 0%, rgba(24,95,165,0.22) 45%, transparent 72%);filter:blur(10px);pointer-events:none}
.hero-inner{position:relative;z-index:2;max-width:1160px;margin:0 auto;padding:56px 32px 0;display:grid;grid-template-columns:1.05fr 0.95fr;gap:40px;align-items:center}
.hero-eyebrow{display:inline-flex;align-items:center;gap:8px;border:1px solid rgba(255,255,255,0.15);color:rgba(255,255,255,0.6);font-size:11px;letter-spacing:1.5px;text-transform:uppercase;padding:6px 14px;border-radius:100px;margin-bottom:26px}
.hero h1{font-size:clamp(34px,4.4vw,58px);font-weight:800;line-height:1.06;letter-spacing:-1.5px;margin-bottom:22px}
.hero h1 em{font-style:normal;background:linear-gradient(92deg,#3DD68C 0%,#2E9BE0 100%);-webkit-background-clip:text;background-clip:text;color:transparent}
.hero p.sub{font-size:16px;color:rgba(255,255,255,0.55);max-width:460px;line-height:1.7;margin-bottom:34px}
.hero-cta{display:flex;gap:12px;flex-wrap:wrap;margin-bottom:44px}
.btn-lg{padding:14px 26px;font-size:14px;border-radius:100px}
.hero-trust{display:flex;gap:26px;flex-wrap:wrap}
.ht-item{display:flex;align-items:center;gap:8px;font-size:12.5px;color:rgba(255,255,255,0.5)}
.ht-dot{width:5px;height:5px;border-radius:50%;background:var(--j);flex-shrink:0}

.hero-art{position:relative;display:flex;align-items:center;justify-content:center}
.hero-logo-card{position:relative;width:100%;max-width:400px;border-radius:28px;overflow:hidden;box-shadow:0 30px 80px -20px rgba(0,0,0,0.6);}
.hero-logo-card img{width:100%;display:block}

.stat-strip{position:relative;z-index:2;border-top:1px solid rgba(255,255,255,0.08);margin-top:56px}
.stat-inner{max-width:1160px;margin:0 auto;padding:26px 32px;display:grid;grid-template-columns:repeat(4,1fr);gap:16px}
.stat{text-align:left}
.stat .num{font-family:'Sora',sans-serif;font-size:26px;font-weight:700;color:#fff}
.stat .lbl{font-size:11.5px;color:rgba(255,255,255,0.4);margin-top:2px;letter-spacing:0.2px}

.roles{padding:88px 0}
.section-head{text-align:center;max-width:600px;margin:0 auto 48px}
.section-head h2{font-size:clamp(26px,3vw,36px);font-weight:700;letter-spacing:-1px;margin-bottom:12px}
.section-head p{font-size:15px;color:var(--gray);line-height:1.6}
.role-cards{display:grid;grid-template-columns:1fr 1fr;gap:20px}
.role-card{border-radius:22px;padding:34px;position:relative;overflow:hidden;transition:transform .2s}
.role-card:hover{transform:translateY(-4px)}
.role-card.client{background:var(--jbl);border:1.5px solid #cfe2f4}
.role-card.provider{background:var(--jl);border:1.5px solid #ffd9c9}
.rc-icon{width:52px;height:52px;border-radius:16px;display:flex;align-items:center;justify-content:center;font-size:24px;margin-bottom:20px;background:#fff}
.role-card h3{font-size:21px;font-weight:700;margin-bottom:8px}
.role-card p{font-size:13.5px;color:var(--gray);line-height:1.65;margin-bottom:22px;max-width:340px}
.rc-list{list-style:none;margin-bottom:26px}
.rc-list li{font-size:13px;color:var(--black);opacity:0.75;padding:5px 0;padding-left:20px;position:relative}
.rc-list li::before{content:'✓';position:absolute;left:0;font-weight:700}
.role-card.client .rc-list li::before{color:var(--jb)}
.role-card.provider .rc-list li::before{color:var(--j)}
.rc-cta{font-size:13.5px;font-weight:600;display:inline-flex;align-items:center;gap:6px}
.role-card.client .rc-cta{color:var(--jb)}
.role-card.provider .rc-cta{color:var(--j)}

.how{padding:88px 0;background:var(--light)}
.how-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:22px}
.how-card{background:var(--white);border:1px solid var(--border);border-radius:18px;padding:26px}
.how-num{font-family:'Sora',sans-serif;font-size:13px;font-weight:700;color:var(--j);margin-bottom:14px}
.how-card h4{font-size:15.5px;font-weight:600;margin-bottom:8px}
.how-card p{font-size:13px;color:var(--gray);line-height:1.65}

.cats{padding:88px 0}
.cat-grid{display:grid;grid-template-columns:repeat(6,1fr);gap:12px}
.cat-chip{border:1px solid var(--border);border-radius:16px;padding:20px 10px;text-align:center;transition:all .15s;background:var(--white)}
.cat-chip:hover{border-color:#ccc;transform:translateY(-2px)}
.cat-chip .ic{font-size:24px;margin-bottom:10px}
.cat-chip .lb{font-size:12px;font-weight:500;color:var(--black)}
.cats-more{text-align:center;margin-top:22px;font-size:13px;color:var(--gray)}
.cats-more a{color:var(--j);font-weight:600}

.trust{padding:88px 0;background:var(--navy);color:#fff}
.trust-inner{display:grid;grid-template-columns:1fr 1fr;gap:56px;align-items:center}
.trust h2{font-size:clamp(26px,3vw,34px);font-weight:700;letter-spacing:-1px;margin-bottom:16px}
.trust p.lead{font-size:14.5px;color:rgba(255,255,255,0.5);line-height:1.7;margin-bottom:6px;max-width:420px}
.trust-feats{display:flex;flex-direction:column;gap:0}
.tf{display:flex;gap:16px;padding:18px 0;border-bottom:1px solid rgba(255,255,255,0.08)}
.tf:last-child{border-bottom:none}
.tf-ic{width:38px;height:38px;border-radius:11px;background:rgba(255,255,255,0.06);display:flex;align-items:center;justify-content:center;font-size:17px;flex-shrink:0}
.tf-t{font-size:14px;font-weight:600;margin-bottom:3px}
.tf-s{font-size:12.5px;color:rgba(255,255,255,0.45);line-height:1.6}

.final{padding:100px 0;text-align:center}
.final h2{font-size:clamp(28px,4vw,44px);font-weight:800;letter-spacing:-1.5px;margin-bottom:16px;max-width:640px;margin-left:auto;margin-right:auto}
.final p{font-size:15px;color:var(--gray);max-width:440px;margin:0 auto 32px}
.final-cta{display:flex;gap:12px;justify-content:center;flex-wrap:wrap}

footer{background:var(--black);color:rgba(255,255,255,0.5);padding:56px 0 28px}
.foot-grid{display:grid;grid-template-columns:1.4fr 1fr 1fr 1fr;gap:32px;padding-bottom:40px;border-bottom:1px solid rgba(255,255,255,0.08)}
.foot-brand{display:flex;align-items:center;gap:9px;margin-bottom:14px}
.foot-brand img{height:26px;width:26px;object-fit:contain}
.foot-brand span{font-family:'Sora',sans-serif;font-size:16px;font-weight:700;color:#fff}
.foot-brand b{color:var(--j)}
.foot-tag{font-size:13px;line-height:1.7;max-width:260px}
.foot-col h5{font-size:11px;letter-spacing:1px;text-transform:uppercase;color:rgba(255,255,255,0.35);margin-bottom:14px;font-weight:600}
.foot-col a{display:block;font-size:13px;color:rgba(255,255,255,0.6);margin-bottom:10px;transition:color .15s}
.foot-col a:hover{color:#fff}
.foot-bottom{display:flex;justify-content:space-between;align-items:center;padding-top:22px;font-size:12px;flex-wrap:wrap;gap:10px}

@media(max-width:860px){
  .nav-links{display:none}
  .hero-inner{grid-template-columns:1fr;text-align:left}
  .hero-art{order:-1;max-width:260px;margin:0 auto 20px}
  .stat-inner{grid-template-columns:repeat(2,1fr)}
  .role-cards{grid-template-columns:1fr}
  .how-grid{grid-template-columns:1fr}
  .cat-grid{grid-template-columns:repeat(3,1fr)}
  .trust-inner{grid-template-columns:1fr;gap:30px}
  .foot-grid{grid-template-columns:1fr 1fr;gap:28px}
}
`;
