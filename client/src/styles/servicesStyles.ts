export const servicesStyles = `
        .hero-grain {
          background-image:
            url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='120' height='120' filter='url(%23n)' opacity='.35'/%3E%3C/svg%3E");
          background-size: 160px 160px;
          mix-blend-mode: overlay;
        }

        .services-card,
        .services-addon-card,
        .custom-package,
        .monthly-offer-panel {
          border-radius: var(--surface-radius);
        }
        .services-card::after {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(120deg, transparent 0%, rgba(255,255,255,0.22) 46%, transparent 70%);
          transform: translateX(-100%);
          animation: services-shine 6s ease-in-out infinite;
          opacity: 0.22;
          pointer-events: none;
        }
        .services-card .text-muted-foreground,
        .services-addon-card .text-muted-foreground {
          color: rgba(255,245,225,0.86);
        }
        .package-icon {
          width: 32px;
          height: 32px;
        }
        .section-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 18px;
          height: 18px;
          color: inherit;
        }
        .section-icon svg {
          width: 18px;
          height: 18px;
        }
        .popular-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 4px 10px;
          border-radius: 999px;
          border: 1px solid rgba(255,210,120,0.65);
          background: linear-gradient(135deg, rgba(42,34,20,0.92), rgba(18,14,8,0.92));
          color: rgba(255,246,220,0.96);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-shadow: 0 0 8px rgba(255,210,140,0.55);
          box-shadow: 0 10px 26px rgba(0,0,0,0.4);
        }
        .popular-badge--top {
          position: absolute;
          top: -18px;
          left: 50%;
          transform: translateX(-50%);
          padding: 6px 14px;
          z-index: 3;
          background: linear-gradient(135deg, rgba(48,38,22,0.95), rgba(16,12,8,0.95));
          box-shadow: 0 12px 30px rgba(0,0,0,0.45);
        }
        .popular-card {
          padding-top: calc(1.5rem + 0.35rem);
        }
        .package-price {
          font-variant-numeric: tabular-nums;
          letter-spacing: 0.02em;
        }
        .custom-step-tag {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 3px 10px;
          border-radius: 999px;
          border: 1px dashed rgba(255,210,120,0.55);
          color: rgba(255,240,210,0.95);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.12em;
          background: rgba(12,12,16,0.55);
          box-shadow: 0 8px 24px rgba(0,0,0,0.35);
        }
        .cta-border-glow {
          position: relative;
          border-color: rgba(255,210,120,0.45);
          box-shadow: 0 0 0 1px rgba(255,210,120,0.18) inset, 0 18px 45px rgba(0,0,0,0.25);
          overflow: hidden;
        }
        .cta-border-glow::after {
          content: "";
          position: absolute;
          inset: 0;
          border-radius: inherit;
          padding: 1px;
          background: linear-gradient(120deg, transparent 0%, rgba(255,235,190,0.85) 45%, transparent 70%);
          opacity: 0.7;
          pointer-events: none;
          transform: translateX(-120%);
          animation: cta-border-sweep 4.6s ease-in-out infinite;
          -webkit-mask:
            linear-gradient(#000 0 0) content-box,
            linear-gradient(#000 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
        }
        .cta-border-glow::before {
          content: "";
          position: absolute;
          inset: -1px;
          border-radius: inherit;
          border: 1px solid rgba(255,210,120,0.35);
          opacity: 0.8;
          pointer-events: none;
        }
        .cta-border-glow:hover {
          border-color: rgba(255,210,120,0.7);
          box-shadow: 0 0 0 1px rgba(255,210,120,0.35) inset, 0 24px 70px rgba(255,200,80,0.2);
        }
        @keyframes cta-border-sweep {
          0% { transform: translateX(-120%); }
          60% { transform: translateX(120%); }
          100% { transform: translateX(120%); }
        }
        .full-day-collapsed {
          cursor: pointer;
        }
        .full-day-body--collapsible {
          position: relative;
          overflow: hidden;
          max-height: 2000px;
          transition: max-height 0.6s ease;
        }
        .full-day-body--collapsed {
          max-height: 360px;
        }
        .full-day-body--collapsed.addon-body {
          max-height: 300px;
        }
        .full-day-fade {
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          height: 140px;
          background: linear-gradient(180deg, rgba(8,8,10,0) 0%, rgba(8,8,10,0.65) 55%, rgba(8,8,10,0.95) 100%);
          pointer-events: none;
        }
        .addon-fade {
          height: 110px;
          background: linear-gradient(180deg, rgba(8,8,10,0) 0%, rgba(8,8,10,0.55) 45%, rgba(8,8,10,0.92) 100%);
        }
        .addon-hint {
          position: absolute;
          left: 0;
          right: 0;
          bottom: 22px;
          text-align: center;
          font-size: 12px;
          letter-spacing: 0.08em;
          color: rgba(255,245,220,0.95);
          text-shadow:
            0 0 12px rgba(255,210,130,0.55),
            0 0 26px rgba(255,210,130,0.35);
          animation: addon-hint-wiggle 2.6s ease-in-out infinite,
            addon-hint-glow 3.2s ease-in-out infinite;
          pointer-events: none;
        }
        .full-day-hint {
          position: absolute;
          left: 0;
          right: 0;
          bottom: 18px;
          display: flex;
          justify-content: center;
          pointer-events: none;
        }
        .full-day-hint-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 14px;
          border-radius: 999px;
          border: 1px solid rgba(255,210,120,0.45);
          background: rgba(12,12,16,0.65);
          color: rgba(255,245,225,0.95);
          font-size: 12px;
          letter-spacing: 0.04em;
          box-shadow: 0 14px 32px rgba(0,0,0,0.35), 0 0 18px rgba(255,200,80,0.22);
          animation: hint-float 2.6s ease-in-out infinite;
        }
        .full-day-hint-pill svg {
          filter: drop-shadow(0 0 8px rgba(255,200,80,0.45));
          animation: hint-bounce 1.8s ease-in-out infinite;
        }
        @keyframes addon-hint-wiggle {
          0%, 100% { transform: translateY(0); }
          25% { transform: translateY(-3px) rotate(-0.6deg); }
          50% { transform: translateY(1px) rotate(0.6deg); }
          75% { transform: translateY(-2px) rotate(-0.3deg); }
        }
        @keyframes addon-hint-glow {
          0%, 100% {
            text-shadow:
              0 0 10px rgba(255,210,130,0.45),
              0 0 20px rgba(255,210,130,0.25);
          }
          50% {
            text-shadow:
              0 0 18px rgba(255,210,130,0.75),
              0 0 34px rgba(255,210,130,0.45);
          }
        }
        .session-addons {
          margin-top: 18px;
          padding-top: 12px;
          border-top: 1px solid rgba(255,255,255,0.08);
        }
        .session-addons-title {
          font-size: 12px;
          color: rgba(255,245,220,0.7);
          letter-spacing: 0.06em;
          margin-bottom: 10px;
          text-transform: uppercase;
          text-align: right;
        }
        .session-addons-grid {
          display: grid;
          gap: 10px;
        }
        .session-addons-grid--buttons {
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        }
        @media (min-width: 640px) {
          .session-addons-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
        .session-addon-chip {
          border: 1px solid rgba(255,210,120,0.35);
          background: rgba(12,12,16,0.55);
          padding: 10px 12px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          text-align: right;
          color: rgba(255,255,255,0.92);
          box-shadow: inset 0 0 0 1px rgba(255,210,120,0.08);
          transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
        }
        .session-addon-chip:hover {
          transform: translateY(-2px);
          border-color: rgba(255,210,120,0.6);
          box-shadow: 0 12px 30px rgba(0,0,0,0.3), inset 0 0 0 1px rgba(255,210,120,0.18);
        }
        .session-addon-chip-title {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          font-weight: 600;
          color: rgba(255,255,255,0.95);
        }
        .session-addon-chip-price {
          font-size: 12px;
          color: rgba(255,220,150,0.95);
          white-space: nowrap;
        }
        @keyframes hint-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(4px); }
        }
        @keyframes hint-bounce {
          0%, 100% { transform: translateY(0); opacity: 0.8; }
          50% { transform: translateY(3px); opacity: 1; }
        }
        @media (max-width: 640px) {
          .full-day-body--collapsed {
            max-height: 300px;
          }
        }

        .quicknav-float {
          background: transparent;
          border: none;
          backdrop-filter: none;
          -webkit-backdrop-filter: none;
          box-shadow: none;
          overflow: visible;
          transform: translateY(0);
          transition: transform 240ms ease, box-shadow 240ms ease, background 240ms ease;
          will-change: transform;
          position: relative;
          margin-top: -6px;
          margin-bottom: 10px;
        }
        .quicknav-float::after {
          content: none;
        }
        .quicknav-stuck {
          position: fixed;
          left: 0;
          right: 0;
          background: rgba(8,8,12,0.68);
          border: none;
          box-shadow: 0 18px 45px rgba(0,0,0,0.35);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          transform: translateY(0);
          animation: nav-float 3.6s ease-in-out infinite;
          margin-top: 0;
          margin-bottom: 0;
        }
        .quicknav-row {
          padding: 6px;
          border-radius: 999px;
          border: 1px solid rgba(255,210,120,0.25);
          background: linear-gradient(120deg, rgba(255,210,120,0.08), rgba(10,10,14,0.7));
          box-shadow: 0 12px 28px rgba(0,0,0,0.35);
        }
        @media (max-width: 640px) {
          .quicknav-float {
            margin-top: -4px;
            margin-bottom: 6px;
          }
          .quicknav-row {
            padding: 4px;
            border-radius: 18px;
          }
        }
        .quicknav-btn {
          position: relative;
          overflow: hidden;
          background: linear-gradient(140deg, rgba(255,210,120,0.1), rgba(10,10,14,0.65) 70%);
          border-color: rgba(255,210,120,0.35);
          color: rgba(255,235,200,0.9);
          box-shadow: inset 0 0 0 1px rgba(255,210,120,0.1);
        }
        .quicknav-btn::after {
          content: "";
          position: absolute;
          inset: -160% -20%;
          background: linear-gradient(120deg, transparent 0%, rgba(255,255,255,0.5) 46%, transparent 72%);
          transform: translateX(-120%);
          animation: services-shine 6.2s ease-in-out infinite;
          opacity: 0.35;
          pointer-events: none;
        }
        .quicknav-btn:hover {
          border-color: rgba(255,210,120,0.65);
          color: #fff2dc;
          box-shadow: 0 0 18px rgba(255,210,130,0.25);
        }
        .quicknav-btn--active {
          background: linear-gradient(140deg, rgba(255,210,120,0.48), rgba(255,255,255,0.12) 70%);
          border-color: rgba(255,210,120,0.9);
          color: #fff7e4;
          text-shadow: 0 0 16px rgba(255,210,130,0.55);
          box-shadow: 0 0 32px rgba(255,210,130,0.65), 0 0 64px rgba(255,210,130,0.25);
        }
        .quicknav-btn--active::after {
          opacity: 0.9;
          animation-duration: 4.6s;
        }
        @keyframes nav-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-2px); }
        }

        .services-subtitle-glow {
          color: rgba(255,245,220,0.9);
          text-shadow: 0 0 16px rgba(255,210,130,0.45);
        }
        .vip-highlight {
          position: relative;
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 8px 16px;
          border-radius: 999px;
          border: 1px solid rgba(255,210,120,0.4);
          background:
            linear-gradient(140deg, rgba(255,210,120,0.18), rgba(10,10,14,0.65) 65%),
            radial-gradient(circle at 20% 20%, rgba(255,245,210,0.25), transparent 60%);
          color: rgba(255,245,220,0.95);
          font-size: 13px;
          line-height: 1.6;
          text-shadow: 0 0 18px rgba(255,210,130,0.55);
          box-shadow: 0 12px 30px rgba(0,0,0,0.35), 0 0 22px rgba(255,210,130,0.18);
          overflow: hidden;
          isolation: isolate;
        }
        .vip-highlight::after {
          content: "";
          position: absolute;
          inset: -120% -10%;
          background: linear-gradient(120deg, transparent 0%, rgba(255,255,255,0.6) 46%, transparent 70%);
          transform: translateX(-120%);
          animation: services-shine 5.5s ease-in-out infinite;
          opacity: 0.55;
          pointer-events: none;
        }
        .vip-highlight-icon {
          color: rgba(255,220,150,0.95);
          filter: drop-shadow(0 0 10px rgba(255,210,130,0.6));
        }
        .section-subtitle-glow {
          color: rgba(255,235,200,0.95);
          text-shadow: 0 0 14px rgba(255,210,130,0.45);
          letter-spacing: 0.08em;
        }
        .prints-title-wrap {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          flex-wrap: wrap;
        }
        .prints-optional-tag {
          font-size: 0.55em;
          padding: 2px 10px;
          border-radius: 999px;
          border: 1px solid rgba(255,210,120,0.45);
          color: rgba(255,240,210,0.95);
          text-shadow: 0 0 14px rgba(255,210,130,0.55);
          background: linear-gradient(120deg, rgba(255,210,120,0.22), rgba(255,255,255,0.06));
          box-shadow: 0 0 18px rgba(255,210,130,0.25);
          letter-spacing: 0.08em;
          white-space: nowrap;
        }
        .pro-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 4px 10px;
          border-radius: 999px;
          border: 1px solid rgba(255,210,120,0.6);
          background: linear-gradient(120deg, rgba(255,210,120,0.4), rgba(255,255,255,0.08));
          color: #fff4d5;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.3em;
          text-transform: uppercase;
          text-shadow: 0 0 14px rgba(255,210,130,0.7);
          box-shadow: 0 10px 30px rgba(255,200,80,0.2);
        }
        .price-corner {
          position: absolute;
          top: 1.6rem;
          left: 1.6rem;
          padding: 0;
          border-radius: 0;
          border: 0;
          background: transparent;
          color: rgba(255,245,220,0.98);
          font-weight: 800;
          font-size: 1.35rem;
          line-height: 1.1;
          letter-spacing: 0.02em;
          text-shadow:
            0 0 12px rgba(255,210,130,0.6),
            0 0 26px rgba(255,210,130,0.35);
          box-shadow: none;
          overflow: hidden;
          z-index: 2;
          pointer-events: none;
          isolation: isolate;
          animation: price-glow 3.6s ease-in-out infinite;
        }
        @media (min-width: 768px) {
          .price-corner {
            top: 1.75rem;
            left: 1.75rem;
          }
          .popular-card {
            padding-top: calc(1.75rem + 0.35rem);
          }
        }
        .price-corner::after {
          content: none;
        }
        .price-corner-note {
          display: block;
          margin-top: 6px;
          font-size: 10px;
          font-weight: 600;
          color: rgba(255,235,200,0.8);
        }
        @keyframes price-glow {
          0%, 100% {
            text-shadow:
              0 0 10px rgba(255,210,130,0.5),
              0 0 20px rgba(255,210,130,0.25);
          }
          50% {
            text-shadow:
              0 0 18px rgba(255,210,130,0.75),
              0 0 34px rgba(255,210,130,0.45);
          }
        }
        .pro-note {
          margin-top: -8px;
          margin-bottom: 18px;
          display: inline-flex;
          align-items: center;
          gap: 10px;
          justify-content: center;
          font-size: 11px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: rgba(255,235,200,0.9);
          text-shadow: 0 0 14px rgba(255,210,130,0.45);
        }
        .pro-note-text {
          opacity: 0.9;
        }
        .pro-note-tag {
          display: inline-block;
          margin-right: 8px;
          font-size: 10px;
          letter-spacing: 0.18em;
          color: rgba(255,240,205,0.9);
          text-shadow: 0 0 10px rgba(255,210,130,0.4);
        }
        .media-tag-glow {
          color: rgba(255,248,225,0.98);
          text-shadow: 0 0 12px rgba(255,210,130,0.7), 0 0 22px rgba(255,210,130,0.4);
        }
        .vip-note {
          color: rgba(255,235,200,0.95);
          text-shadow: 0 0 14px rgba(255,210,130,0.5);
        }
        .price-note-inline {
          margin-right: 8px;
          font-size: 10px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: rgba(255,235,200,0.85);
          text-shadow: 0 0 10px rgba(255,210,130,0.35);
        }
        .addon-special-tag {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 3px 9px;
          border-radius: 999px;
          border: 1px solid rgba(255,210,120,0.55);
          background:
            linear-gradient(130deg, rgba(255,210,120,0.35), rgba(255,255,255,0.08)),
            radial-gradient(circle at 20% 20%, rgba(255,245,210,0.35), transparent 60%);
          color: rgba(255,245,220,0.98);
          font-size: 10px;
          font-weight: 700;
          text-shadow: 0 0 10px rgba(255,210,130,0.7);
          box-shadow:
            0 6px 18px rgba(0,0,0,0.35),
            0 0 16px rgba(255,210,130,0.35);
          position: relative;
          overflow: hidden;
        }
        .addon-special-tag::after {
          content: "";
          position: absolute;
          inset: -120% -20%;
          background: linear-gradient(120deg, transparent 0%, rgba(255,255,255,0.7) 46%, transparent 70%);
          transform: translateX(-120%);
          animation: services-shine 5.8s ease-in-out infinite;
          opacity: 0.45;
          pointer-events: none;
        }

        .custom-package {
          background:
            linear-gradient(145deg, rgba(18,18,24,0.9), rgba(8,8,12,0.98)),
            radial-gradient(circle at 20% 15%, rgba(255,210,120,0.12), transparent 55%);
          border-style: dashed;
          border-color: rgba(255,210,120,0.45);
          box-shadow: 0 22px 70px rgba(0,0,0,0.45), inset 0 0 0 1px rgba(255,210,120,0.25);
          border-radius: var(--surface-radius);
          aspect-ratio: auto;
          max-width: 520px;
          min-height: 320px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .custom-body {
          text-align: right;
        }
        .custom-cta {
          margin-top: 18px;
          display: flex;
          justify-content: center;
        }
        .custom-cta-btn {
          max-width: 320px;
        }
        .monthly-offer-cta {
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          text-align: center;
        }
        .monthly-offer-hint {
          position: relative;
          padding: 0;
          border-radius: 0;
          border: none;
          background: transparent;
          color: rgba(255,240,210,0.98);
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-shadow:
            0 0 12px rgba(255,215,160,0.8),
            0 0 22px rgba(255,180,120,0.55);
          overflow: visible;
        }
        .monthly-offer-hint::after {
          content: none;
        }
        .monthly-offer-btn {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 12px 32px;
          min-width: 170px;
          text-transform: none;
          line-height: 1;
        }
        .monthly-offer-btn-text {
          color: inherit;
          font-weight: 700;
          white-space: nowrap;
        }
        .monthly-offer-sticker {
          position: absolute;
          top: 16px;
          left: 16px;
          padding: 10px 18px;
          border-radius: 999px;
          border: 2px solid rgba(255,255,255,0.75);
          background: radial-gradient(circle at 35% 30%, #ffd2b8, #ff7a7a 55%, #ff5b5b 100%);
          color: #fff6f0;
          font-size: 15px;
          font-weight: 900;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          box-shadow:
            0 12px 26px rgba(0,0,0,0.4),
            0 0 26px rgba(255,120,90,0.85),
            0 0 40px rgba(255,160,140,0.6);
          transform: rotate(6deg);
          z-index: 2;
        }
        .monthly-offer-sticker::after {
          content: "";
          position: absolute;
          inset: 3px;
          border-radius: 999px;
          border: 1px dashed rgba(255,255,255,0.7);
          pointer-events: none;
        }
        .monthly-offer-sticker::before {
          content: "";
          position: absolute;
          inset: -120% -20%;
          background: linear-gradient(120deg, transparent 0%, rgba(255,255,255,0.75) 46%, transparent 70%);
          transform: translateX(-120%);
          animation: services-shine 6s ease-in-out infinite;
          opacity: 0.55;
          pointer-events: none;
        }
        .monthly-offer-panel {
          width: min(100%, 760px);
          margin-top: 8px;
          animation: monthly-offer-in 0.35s ease;
        }
        @keyframes monthly-offer-in {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .monthly-offer-card {
          position: relative;
          overflow: hidden;
          border-radius: var(--surface-radius);
          padding: 28px;
          background:
            linear-gradient(140deg, rgba(18,18,24,0.95), rgba(10,10,14,0.98)),
            radial-gradient(circle at 15% 20%, rgba(255,140,120,0.14), transparent 55%);
          border: 1px solid rgba(255,255,255,0.12);
          box-shadow:
            0 24px 70px rgba(0,0,0,0.5),
            0 0 24px rgba(255,120,100,0.18);
          color: #fff6f0;
        }
        .monthly-offer-card::before {
          content: "";
          position: absolute;
          inset: 0;
          background:
            linear-gradient(120deg, rgba(255,255,255,0.05), transparent 40%),
            repeating-linear-gradient(135deg, rgba(255,255,255,0.03) 0 1px, transparent 1px 16px);
          opacity: 0.25;
          pointer-events: none;
        }
        .monthly-offer-card::after {
          content: "";
          position: absolute;
          top: -50%;
          right: -40%;
          width: 70%;
          height: 140%;
          background: radial-gradient(circle, rgba(255,130,110,0.25), transparent 70%);
          opacity: 0.45;
          pointer-events: none;
        }
        .monthly-offer-sparkle {
          position: absolute;
          inset: -120% -20%;
          background: linear-gradient(120deg, transparent 0%, rgba(255,255,255,0.7) 46%, transparent 70%);
          transform: translateX(-120%);
          animation: services-shine 5.6s ease-in-out infinite;
          opacity: 0.45;
          pointer-events: none;
        }
        .monthly-offer-stamp {
          position: absolute;
          top: 16px;
          right: 16px;
          padding: 8px 16px;
          border-radius: 12px;
          border: 2px solid rgba(255,255,255,0.55);
          background: linear-gradient(135deg, #ff5858, #ff9f6e);
          font-size: 14px;
          font-weight: 900;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: #fff6f1;
          box-shadow:
            0 12px 28px rgba(0,0,0,0.45),
            0 0 18px rgba(255,120,120,0.5);
          transform: rotate(6deg);
          z-index: 2;
        }
        .monthly-offer-stamp::after {
          content: "";
          position: absolute;
          inset: 3px;
          border-radius: 10px;
          border: 1px dashed rgba(255,255,255,0.7);
          pointer-events: none;
        }
        .monthly-offer-stamp::before {
          content: "";
          position: absolute;
          inset: -120% -20%;
          background: linear-gradient(120deg, transparent 0%, rgba(255,255,255,0.75) 46%, transparent 70%);
          transform: translateX(-120%);
          animation: services-shine 6s ease-in-out infinite;
          opacity: 0.55;
          pointer-events: none;
        }
        .monthly-offer-top {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 16px;
          position: relative;
          z-index: 2;
          align-items: start;
        }
        .monthly-offer-header {
          position: relative;
          z-index: 2;
          text-align: right;
        }
        .monthly-offer-kicker {
          display: inline-flex;
          padding: 4px 12px;
          border-radius: 999px;
          border: 1px dashed rgba(255,180,170,0.5);
          font-size: 11px;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: rgba(255,235,230,0.95);
          background: rgba(12,12,16,0.5);
        }
        .monthly-offer-title {
          font-size: 26px;
          font-weight: 800;
          margin-top: 10px;
          text-shadow: 0 0 18px rgba(255,140,120,0.55);
        }
        .monthly-offer-subtitle {
          margin-top: 8px;
          font-size: 13px;
          color: rgba(255,225,220,0.9);
        }
        .monthly-offer-price {
          position: relative;
          padding: 10px 12px;
          border-radius: 14px;
          border: 1px solid rgba(255,160,140,0.45);
          background: linear-gradient(120deg, rgba(255,160,140,0.18), rgba(10,10,14,0.82));
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          z-index: 2;
          max-width: 220px;
          align-self: flex-end;
        }
        .monthly-offer-price-label {
          font-size: 11px;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: rgba(255,220,220,0.85);
        }
        .monthly-offer-price-value {
          font-size: 22px;
          font-weight: 800;
          color: #ffe4e0;
          text-shadow: 0 0 18px rgba(255,120,120,0.7);
        }
        .monthly-offer-features {
          margin-top: 18px;
          display: grid;
          gap: 8px;
          position: relative;
          z-index: 2;
        }
        .monthly-offer-feature {
          display: grid;
          grid-template-columns: 12px 1fr;
          gap: 10px;
          font-size: 13px;
          color: rgba(255,245,235,0.94);
        }
        .monthly-offer-bullet {
          width: 10px;
          height: 10px;
          margin-top: 6px;
          border-radius: 50%;
          background: rgba(255,140,120,0.95);
          box-shadow: 0 0 12px rgba(255,130,110,0.9);
        }
        .monthly-offer-cta-row {
          margin-top: 20px;
          position: relative;
          z-index: 2;
        }
        .monthly-offer-book {
          width: 100%;
          height: 52px;
          border-radius: 16px;
          border: none;
          background: linear-gradient(120deg, #ff6b5e, #ff8a5b 55%, #ffc06d);
          color: #fff6f0;
          font-weight: 800;
          letter-spacing: 0.08em;
          box-shadow: 0 12px 30px rgba(255,80,70,0.45);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .monthly-offer-book:hover {
          transform: translateY(-1px);
          box-shadow: 0 16px 40px rgba(255,80,70,0.55);
        }
        @media (max-width: 640px) {
          .monthly-offer-top {
            grid-template-columns: 1fr;
          }
          .monthly-offer-price {
            max-width: 100%;
          }
        }
        @media (min-width: 768px) {
          .monthly-offer-features {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
        .custom-builder {
          margin-top: 10px;
          display: flex;
          flex-direction: column;
          gap: 2px;
          text-align: right;
        }
        .custom-title {
          font-size: inherit;
          color: #ffffff;
          text-shadow: none;
          letter-spacing: 0;
        }
        .custom-price {
          text-align: right;
        }
        .custom-price-main {
          font-size: 12px;
          font-weight: 700;
          color: rgba(255,235,200,0.95);
          text-shadow: 0 0 14px rgba(255,210,130,0.6);
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }
        .custom-price-sub {
          margin-top: 6px;
          font-size: 12px;
          color: rgba(255,245,230,0.92);
          text-shadow:
            0 0 14px rgba(255,210,130,0.6),
            0 0 28px rgba(255,210,130,0.45);
        }
        .custom-hint {
          font-size: 13px;
          color: rgba(255,255,255,0.7);
          text-shadow: none;
          letter-spacing: 0;
          text-align: right;
          margin: 2px 0 4px;
        }
        .custom-group {
          border: 0;
          border-radius: 16px;
          padding: 4px 6px 6px;
          background: rgba(18,18,26,0.88);
          box-shadow: none;
        }
        .custom-group-title {
          font-size: 14px;
          font-weight: 700;
          color: rgba(255,240,210,0.98);
          letter-spacing: 0;
          text-transform: none;
          font-family: "Cairo", sans-serif;
          margin-bottom: 2px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .custom-vip-tag {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 2px 8px;
          border-radius: 999px;
          border: 1px solid rgba(255,210,120,0.6);
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          background: linear-gradient(120deg, rgba(255,210,120,0.45), rgba(255,255,255,0.12));
          color: #fff5d6;
          text-shadow: 0 0 12px rgba(255,210,130,0.7);
          box-shadow: 0 10px 24px rgba(255,200,80,0.2);
          position: relative;
          overflow: hidden;
        }
        .custom-vip-tag::after {
          content: "";
          position: absolute;
          inset: -120% -20%;
          background: linear-gradient(120deg, transparent 0%, rgba(255,255,255,0.6) 46%, transparent 70%);
          transform: translateX(-120%);
          animation: services-shine 5.8s ease-in-out infinite;
          opacity: 0.5;
          pointer-events: none;
        }
        .custom-group-items {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .custom-item {
          display: grid;
          grid-template-columns: 18px minmax(0, 1fr) auto;
          gap: 8px;
          align-items: start;
          font-size: 14px;
          color: rgba(255,255,255,0.92);
        }
        .custom-item-label {
          line-height: 1.6;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 6px;
          cursor: pointer;
        }
        .custom-item-title {
          color: rgba(255,255,255,0.92);
        }
        .custom-item-price {
          font-size: 13px;
          color: rgba(255,220,150,0.95);
          text-shadow: 0 0 12px rgba(255,210,130,0.55);
          font-variant-numeric: tabular-nums;
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 4px;
          cursor: pointer;
          white-space: nowrap;
        }
        .custom-item-mult {
          font-size: 10px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: rgba(255,230,190,0.8);
        }
        .custom-qty {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          padding: 6px 8px;
          border-radius: 12px;
          border: 1px dashed rgba(255,210,120,0.45);
          background: rgba(12,12,16,0.55);
          box-shadow: inset 0 0 0 1px rgba(255,210,120,0.12);
        }
        .custom-qty-label {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: rgba(255,230,190,0.95);
        }
        .custom-qty-dot {
          width: 6px;
          height: 6px;
          border-radius: 999px;
          background: rgba(255,210,120,0.95);
          box-shadow: 0 0 10px rgba(255,210,130,0.75);
          animation: custom-dot-pulse 1.6s ease-in-out infinite;
        }
        .custom-qty-controls {
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .custom-qty-btn {
          width: 22px;
          height: 22px;
          border-radius: 8px;
          border: 1px solid rgba(255,210,120,0.6);
          background: rgba(10,10,14,0.7);
          color: rgba(255,245,220,0.95);
          font-weight: 700;
          line-height: 1;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        .custom-qty-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        .custom-qty-btn:not(:disabled):hover {
          transform: translateY(-1px);
          box-shadow: 0 0 12px rgba(255,210,130,0.45);
        }
        .custom-qty-value {
          min-width: 20px;
          text-align: center;
          font-size: 13px;
          font-weight: 700;
          color: rgba(255,245,220,0.95);
        }
        .custom-checkbox {
          width: 18px;
          height: 18px;
          border-radius: 6px;
          border: 1px solid rgba(255,210,120,0.65);
          background: rgba(10,10,14,0.7);
          box-shadow: 0 0 0 1px rgba(255,210,120,0.3) inset, 0 4px 12px rgba(0,0,0,0.35);
          position: relative;
        }
        .custom-checkbox[data-state="checked"] {
          background: rgba(255,210,120,0.9);
          color: #1b1207;
          border-color: rgba(255,210,120,0.9);
          box-shadow: 0 0 16px rgba(255,210,130,0.55);
        }
        .custom-checkbox[data-state="unchecked"] {
          animation: custom-border-pulse 1.8s ease-in-out infinite;
        }
        @keyframes custom-border-pulse {
          0%, 100% {
            box-shadow:
              0 0 0 1px rgba(255,210,120,0.35) inset,
              0 0 0 0 rgba(255,210,120,0.35);
          }
          50% {
            box-shadow:
              0 0 0 1px rgba(255,210,120,0.55) inset,
              0 0 12px rgba(255,210,120,0.45);
          }
        }
        @keyframes custom-dot-pulse {
          0%, 100% { transform: scale(1); opacity: 0.7; }
          50% { transform: scale(1.4); opacity: 1; }
        }
        .custom-total {
          width: 100%;
          padding: 8px 10px;
          border-radius: 14px;
          border: 1px solid rgba(255,210,120,0.65);
          background:
            linear-gradient(120deg, rgba(255,210,120,0.28), rgba(12,12,16,0.75) 55%),
            radial-gradient(circle at 20% 20%, rgba(255,240,200,0.25), transparent 60%);
          color: rgba(255,250,230,0.98);
          font-weight: 700;
          text-align: center;
          text-shadow:
            0 0 12px rgba(255,210,130,0.55),
            0 0 22px rgba(255,210,130,0.35);
          box-shadow:
            0 12px 30px rgba(0,0,0,0.4),
            0 0 28px rgba(255,210,130,0.35);
          position: relative;
          overflow: hidden;
        }
        .custom-total::after {
          content: "";
          position: absolute;
          inset: -140% -20%;
          background: linear-gradient(120deg, transparent 0%, rgba(255,255,255,0.6) 46%, transparent 70%);
          transform: translateX(-120%);
          animation: services-shine 4.8s ease-in-out infinite;
          opacity: 0.55;
          pointer-events: none;
        }
        .custom-total-row {
          margin-top: 6px;
          display: block;
        }
        .custom-clear {
          border-color: rgba(255,210,120,0.45);
          color: rgba(255,235,200,0.95);
          background: rgba(12,12,16,0.35);
          box-shadow: inset 0 0 0 1px rgba(255,210,120,0.15);
        }
        @media (max-width: 640px) {
          .custom-package {
            border-radius: var(--surface-radius);
            max-width: 100%;
            min-height: 0;
          }
          .services-card {
            padding: 24px;
          }
        }
        .custom-line {
          margin-top: 8px;
          padding: 10px 14px;
          border-radius: 14px;
          border: 1px solid rgba(255,210,120,0.3);
          background: rgba(12,12,16,0.6);
          color: rgba(255,230,190,0.92);
          font-size: 13px;
          letter-spacing: 0.04em;
          line-height: 1.6;
          box-shadow: 0 10px 28px rgba(0,0,0,0.35);
        }
        .custom-line--compact {
          margin-top: 4px;
          padding: 8px 12px;
        }
        .custom-description {
          display: block;
          color: #ffffff;
          font-size: 16px;
          font-weight: 700;
          letter-spacing: 0;
          text-transform: none;
          padding: 0;
          background: transparent;
          border: 0;
          box-shadow: none;
          text-shadow: 0 0 14px rgba(255,255,255,0.25);
        }
        .custom-note-text {
          color: rgba(255,245,230,0.98);
          font-weight: 700;
          text-shadow:
            0 0 12px rgba(255,210,130,0.55),
            0 0 24px rgba(255,210,130,0.35);
        }
        .promo-arrow {
          filter: drop-shadow(0 0 10px rgba(255,200,80,0.35));
          animation: promo-float 2.8s ease-in-out infinite;
        }
        @keyframes promo-float {
          0%, 100% { transform: translateY(0); opacity: 0.55; }
          50% { transform: translateY(4px); opacity: 0.9; }
        }
        @keyframes services-shine {
          0% { transform: translateX(-120%); }
          65% { transform: translateX(120%); }
          100% { transform: translateX(120%); }
        }

`;
