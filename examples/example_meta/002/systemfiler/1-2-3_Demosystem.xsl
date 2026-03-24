<?xml version="1.0" encoding="utf-8"?>
<xsl:stylesheet version="1.0"
    xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
    xmlns:xlink="http://www.w3.org/1999/xlink"
    xmlns:mau="http://www.mau.se/e-arkiv">

  <xsl:output method="html" encoding="utf-8" indent="yes" doctype-public="-//W3C//DTD HTML 4.01//EN"/>

  <xsl:template match="/mau:root">
    <html lang="sv">
      <head>
        <meta charset="utf-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
        <title>Demosystem – <xsl:value-of select="@PERSONNUMMER"/></title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,wght@0,300;0,400;0,600;1,300&amp;family=IBM+Plex+Mono:wght@400;500&amp;family=IBM+Plex+Sans:wght@300;400;500&amp;display=swap');

          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

          :root {
            --navy:      #0d2340;
            --teal:      #00616e;
            --teal-lt:   #e0f4f6;
            --gold:      #c8922a;
            --gray-100:  #f4f6f8;
            --gray-200:  #e8ecf0;
            --gray-400:  #8d9aaa;
            --gray-700:  #3d4f60;
            --white:     #ffffff;
            --radius:    6px;
          }

          body {
            font-family: 'IBM Plex Sans', sans-serif;
            background: var(--gray-100);
            color: var(--navy);
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 48px 16px 80px;
          }

          /* ── Header bar ─────────────────────────────── */
          .page-header {
            width: 100%;
            max-width: 760px;
            display: flex;
            align-items: center;
            gap: 14px;
            margin-bottom: 36px;
          }

          .header-logo {
            width: 44px;
            height: 44px;
            background: var(--navy);
            border-radius: var(--radius);
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
          }

          .header-logo svg { display: block; }

          .header-text {}
          .header-text h1 {
            font-family: 'Source Serif 4', serif;
            font-size: 1.35rem;
            font-weight: 600;
            letter-spacing: -0.02em;
            color: var(--navy);
            line-height: 1.2;
          }
          .header-text p {
            font-size: 0.78rem;
            color: var(--gray-400);
            font-weight: 300;
            margin-top: 2px;
            letter-spacing: 0.04em;
            text-transform: uppercase;
          }

          /* ── Card ───────────────────────────────────── */
          .card {
            width: 100%;
            max-width: 760px;
            background: var(--white);
            border-radius: 10px;
            box-shadow: 0 2px 8px rgba(13,35,64,.07), 0 0 0 1px rgba(13,35,64,.06);
            overflow: hidden;
            margin-bottom: 20px;
          }

          .card-header {
            background: var(--navy);
            padding: 20px 28px;
            display: flex;
            align-items: center;
            justify-content: space-between;
          }

          .card-header-title {
            font-family: 'Source Serif 4', serif;
            font-size: 1.05rem;
            font-weight: 300;
            color: var(--white);
            letter-spacing: 0.01em;
          }

          .card-header-badge {
            font-family: 'IBM Plex Mono', monospace;
            font-size: 0.72rem;
            background: rgba(255,255,255,0.12);
            color: rgba(255,255,255,0.7);
            padding: 4px 10px;
            border-radius: 20px;
            letter-spacing: 0.06em;
          }

          .card-body { padding: 28px; }

          /* ── Field grid ─────────────────────────────── */
          .field-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
            margin-bottom: 24px;
          }

          .field {
            background: var(--gray-100);
            border-radius: var(--radius);
            padding: 14px 16px;
            border-left: 3px solid var(--teal);
          }

          .field-label {
            font-size: 0.68rem;
            font-weight: 500;
            text-transform: uppercase;
            letter-spacing: 0.09em;
            color: var(--gray-400);
            margin-bottom: 5px;
          }

          .field-value {
            font-family: 'IBM Plex Mono', monospace;
            font-size: 0.95rem;
            font-weight: 500;
            color: var(--navy);
          }

          /* ── Divider ────────────────────────────────── */
          .divider {
            height: 1px;
            background: var(--gray-200);
            margin: 4px 0 24px;
          }

          /* ── Section title ──────────────────────────── */
          .section-title {
            font-size: 0.72rem;
            font-weight: 500;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            color: var(--teal);
            margin-bottom: 14px;
          }

          /* ── Attachment row ─────────────────────────── */
          .attachment {
            display: flex;
            align-items: center;
            gap: 14px;
            background: var(--teal-lt);
            border: 1px solid rgba(0,97,110,.15);
            border-radius: var(--radius);
            padding: 14px 18px;
            text-decoration: none;
            transition: background 0.18s, box-shadow 0.18s;
          }

          .attachment:hover {
            background: #c5edf0;
            box-shadow: 0 2px 8px rgba(0,97,110,.12);
          }

          .attachment-icon {
            width: 38px;
            height: 38px;
            background: var(--teal);
            border-radius: 6px;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
          }

          .attachment-info { flex: 1; min-width: 0; }

          .attachment-name {
            font-size: 0.92rem;
            font-weight: 500;
            color: var(--navy);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .attachment-meta {
            font-size: 0.75rem;
            color: var(--gray-400);
            margin-top: 2px;
          }

          .attachment-arrow {
            color: var(--teal);
            font-size: 1.2rem;
            flex-shrink: 0;
          }

          /* ── Hash block ─────────────────────────────── */
          .hash-block {
            margin-top: 16px;
            background: var(--gray-100);
            border-radius: var(--radius);
            padding: 12px 16px;
          }

          .hash-label {
            font-size: 0.67rem;
            text-transform: uppercase;
            letter-spacing: 0.09em;
            color: var(--gray-400);
            margin-bottom: 5px;
          }

          .hash-value {
            font-family: 'IBM Plex Mono', monospace;
            font-size: 0.72rem;
            color: var(--gray-700);
            word-break: break-all;
            line-height: 1.6;
          }

          /* ── Footer ─────────────────────────────────── */
          .footer {
            width: 100%;
            max-width: 760px;
            text-align: center;
            font-size: 0.72rem;
            color: var(--gray-400);
            margin-top: 8px;
          }

          @media (max-width: 520px) {
            .field-grid { grid-template-columns: 1fr; }
            .card-body { padding: 20px; }
          }
        </style>
      </head>
      <body>

        <!-- Page header -->
        <div class="page-header">
          <div class="header-logo">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="4" y="3" width="10" height="13" rx="1" fill="white" fill-opacity="0.9"/>
              <rect x="10" y="8" width="10" height="13" rx="1" fill="white" fill-opacity="0.4"/>
              <rect x="4" y="3" width="10" height="13" rx="1" stroke="white" stroke-opacity="0.3" stroke-width="0.5"/>
            </svg>
          </div>
          <div class="header-text">
            <h1>Demosystem</h1>
            <p>Malmö Universitet · E-arkiv</p>
          </div>
        </div>

        <!-- Main card -->
        <div class="card">
          <div class="card-header">
            <span class="card-header-title">Arkivpost</span>
            <span class="card-header-badge">1-2-3 Demosystem</span>
          </div>
          <div class="card-body">

            <!-- Fields -->
            <div class="field-grid">
              <div class="field">
                <div class="field-label">Personnummer</div>
                <div class="field-value"><xsl:value-of select="@PERSONNUMMER"/></div>
              </div>
              <div class="field">
                <div class="field-label">Datum</div>
                <div class="field-value"><xsl:value-of select="@DATUM"/></div>
              </div>
            </div>

            <div class="divider"/>

            <!-- Attachment -->
            <div class="section-title">Bilaga</div>

            <xsl:for-each select="mau:file_binary">
              <a class="attachment">
                <xsl:attribute name="href">
                  <xsl:value-of select="@xlink:href"/>
                </xsl:attribute>
                <xsl:attribute name="title">
                  <xsl:value-of select="@xlink:title"/>
                </xsl:attribute>

                <div class="attachment-icon">
                  <!-- PDF icon -->
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                    <polyline points="14 2 14 8 20 8" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                    <line x1="8" y1="13" x2="16" y2="13" stroke="white" stroke-width="1.8" stroke-linecap="round"/>
                    <line x1="8" y1="17" x2="16" y2="17" stroke="white" stroke-width="1.8" stroke-linecap="round"/>
                  </svg>
                </div>

                <div class="attachment-info">
                  <div class="attachment-name"><xsl:value-of select="@xlink:title"/></div>
                  <div class="attachment-meta">
                    <xsl:variable name="kb" select="round(@Size div 1024)"/>
                    <xsl:choose>
                      <xsl:when test="$kb &gt; 1024">
                        <xsl:value-of select="round($kb div 1024)"/> MB
                      </xsl:when>
                      <xsl:otherwise>
                        <xsl:value-of select="$kb"/> KB
                      </xsl:otherwise>
                    </xsl:choose>
                    · PDF
                  </div>
                </div>

                <span class="attachment-arrow">→</span>
              </a>

              <!-- SHA-256 hash -->
              <div class="hash-block">
                <div class="hash-label">SHA-256 kontrollsumma</div>
                <div class="hash-value"><xsl:value-of select="@sha256"/></div>
              </div>
            </xsl:for-each>

          </div>
        </div>

        <div class="footer">
          Malmö Universitet · Digitalt e-arkiv
        </div>

      </body>
    </html>
  </xsl:template>

</xsl:stylesheet>
