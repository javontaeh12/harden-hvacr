import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import sharp from 'sharp';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load fonts once at module level
const fontsDir = join(process.cwd(), 'public', 'fonts');
const bebasNeue = readFileSync(join(fontsDir, 'BebasNeue-Regular.ttf'));
const bricolage = readFileSync(join(fontsDir, 'BricolageGrotesque-Variable.ttf'));

// Load logo once
const logoPath = join(process.cwd(), 'public', 'logo-transparent.png');
let logoBase64: string;
try {
  const logoBuf = readFileSync(logoPath);
  logoBase64 = `data:image/png;base64,${logoBuf.toString('base64')}`;
} catch {
  logoBase64 = '';
}

// Brand constants
const BRAND = {
  navy: '#0a1f3f',
  navyLight: '#122e5c',
  accent: '#42a5f5',
  gold: '#f5a623',
  ember: '#e55b2b',
  white: '#ffffff',
  ice: '#dceaf8',
};

interface AdConfig {
  headline: string;
  cta: string;
  platform: string;
  contentType: string;
  backgroundImageUrl: string;
}

// Platform dimensions
function getDimensions(platform: string, contentType: string): { width: number; height: number } {
  if (platform === 'instagram' && contentType === 'story') return { width: 1080, height: 1920 };
  if (platform === 'instagram') return { width: 1080, height: 1080 };
  if (platform === 'facebook') return { width: 1200, height: 628 };
  if (platform === 'google_ads') return { width: 1200, height: 628 };
  if (platform === 'email') return { width: 1200, height: 400 };
  return { width: 1200, height: 628 };
}

// Calculate font size to fit container
function getHeadlineSize(text: string, width: number, isVertical: boolean): number {
  const maxCharsPerLine = isVertical ? 15 : 20;
  const baseSize = isVertical ? 82 : 76;
  if (text.length > maxCharsPerLine * 3) return Math.max(40, baseSize - 28);
  if (text.length > maxCharsPerLine * 2) return Math.max(46, baseSize - 20);
  if (text.length > maxCharsPerLine) return Math.max(54, baseSize - 10);
  return baseSize;
}

// Facebook / Google Ads / Email — Landscape template
function landscapeAd(config: AdConfig, bgBase64: string, dims: { width: number; height: number }) {
  const fontSize = getHeadlineSize(config.headline, dims.width, false);

  return {
    type: 'div' as const,
    props: {
      style: {
        width: dims.width,
        height: dims.height,
        display: 'flex',
        position: 'relative' as const,
        overflow: 'hidden',
        fontFamily: 'Bricolage Grotesque',
      },
      children: [
        // Background image
        {
          type: 'img' as const,
          props: {
            src: bgBase64,
            style: {
              position: 'absolute' as const,
              top: 0,
              left: 0,
              width: dims.width,
              height: dims.height,
              objectFit: 'cover' as const,
            },
          },
        },
        // Dark gradient overlay — left side for text
        {
          type: 'div' as const,
          props: {
            style: {
              position: 'absolute' as const,
              top: 0,
              left: 0,
              width: dims.width,
              height: dims.height,
              background: 'linear-gradient(to right, rgba(10,31,63,0.6) 0%, rgba(10,31,63,0.4) 40%, rgba(10,31,63,0.05) 65%, transparent 100%)',
            },
          },
        },
        // Content container — left side
        {
          type: 'div' as const,
          props: {
            style: {
              position: 'absolute' as const,
              top: 0,
              left: 0,
              width: Math.round(dims.width * 0.55),
              height: dims.height,
              display: 'flex',
              flexDirection: 'column' as const,
              justifyContent: 'center',
              padding: '40px 50px',
            },
            children: [
              // Logo
              logoBase64 ? {
                type: 'img' as const,
                props: {
                  src: logoBase64,
                  style: {
                    width: 220,
                    height: 'auto',
                    marginBottom: 24,
                  },
                },
              } : null,
              // Gold accent line
              {
                type: 'div' as const,
                props: {
                  style: {
                    width: 60,
                    height: 4,
                    backgroundColor: BRAND.gold,
                    marginBottom: 20,
                    borderRadius: 2,
                  },
                },
              },
              // Headline
              {
                type: 'div' as const,
                props: {
                  style: {
                    fontFamily: 'Bebas Neue',
                    fontSize,
                    lineHeight: 1.05,
                    color: BRAND.white,
                    letterSpacing: '2px',
                    textTransform: 'uppercase' as const,
                    marginBottom: 28,
                    textShadow: '0 2px 8px rgba(0,0,0,0.5)',
                  },
                  children: config.headline,
                },
              },
              // CTA button
              config.cta ? {
                type: 'div' as const,
                props: {
                  style: {
                    display: 'flex',
                    alignItems: 'center',
                  },
                  children: [
                    {
                      type: 'div' as const,
                      props: {
                        style: {
                          backgroundColor: BRAND.gold,
                          color: BRAND.navy,
                          fontFamily: 'Bebas Neue',
                          fontSize: 22,
                          letterSpacing: '1.5px',
                          padding: '12px 32px',
                          borderRadius: 6,
                          textTransform: 'uppercase' as const,
                          fontWeight: 700,
                        },
                        children: config.cta,
                      },
                    },
                  ],
                },
              } : null,
            ].filter(Boolean),
          },
        },
        // Bottom bar with website
        {
          type: 'div' as const,
          props: {
            style: {
              position: 'absolute' as const,
              bottom: 0,
              left: 0,
              width: dims.width,
              height: 36,
              backgroundColor: BRAND.navy,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            },
            children: [
              {
                type: 'div' as const,
                props: {
                  style: {
                    fontFamily: 'Bebas Neue',
                    fontSize: 16,
                    color: BRAND.gold,
                    letterSpacing: '3px',
                    textTransform: 'uppercase' as const,
                  },
                  children: 'hardenhvacr.com',
                },
              },
            ],
          },
        },
      ],
    },
  };
}

// Instagram Post — Square template
function squareAd(config: AdConfig, bgBase64: string, dims: { width: number; height: number }) {
  const fontSize = getHeadlineSize(config.headline, dims.width, false);

  return {
    type: 'div' as const,
    props: {
      style: {
        width: dims.width,
        height: dims.height,
        display: 'flex',
        position: 'relative' as const,
        overflow: 'hidden',
        fontFamily: 'Bricolage Grotesque',
      },
      children: [
        // Background
        {
          type: 'img' as const,
          props: {
            src: bgBase64,
            style: {
              position: 'absolute' as const,
              top: 0,
              left: 0,
              width: dims.width,
              height: dims.height,
              objectFit: 'cover' as const,
            },
          },
        },
        // Dark gradient — bottom heavy
        {
          type: 'div' as const,
          props: {
            style: {
              position: 'absolute' as const,
              top: 0,
              left: 0,
              width: dims.width,
              height: dims.height,
              background: 'linear-gradient(to bottom, rgba(10,31,63,0.1) 0%, rgba(10,31,63,0.15) 40%, rgba(10,31,63,0.5) 70%, rgba(10,31,63,0.7) 100%)',
            },
          },
        },
        // Logo top-left
        logoBase64 ? {
          type: 'div' as const,
          props: {
            style: {
              position: 'absolute' as const,
              top: 30,
              left: 30,
              display: 'flex',
            },
            children: [
              {
                type: 'img' as const,
                props: {
                  src: logoBase64,
                  style: { width: 180, height: 'auto' },
                },
              },
            ],
          },
        } : null,
        // Bottom content
        {
          type: 'div' as const,
          props: {
            style: {
              position: 'absolute' as const,
              bottom: 0,
              left: 0,
              width: dims.width,
              padding: '0 40px 50px',
              display: 'flex',
              flexDirection: 'column' as const,
            },
            children: [
              // Gold accent line
              {
                type: 'div' as const,
                props: {
                  style: {
                    width: 50,
                    height: 4,
                    backgroundColor: BRAND.gold,
                    marginBottom: 16,
                    borderRadius: 2,
                  },
                },
              },
              // Headline
              {
                type: 'div' as const,
                props: {
                  style: {
                    fontFamily: 'Bebas Neue',
                    fontSize,
                    lineHeight: 1.05,
                    color: BRAND.white,
                    letterSpacing: '2px',
                    textTransform: 'uppercase' as const,
                    marginBottom: 24,
                    textShadow: '0 2px 8px rgba(0,0,0,0.5)',
                  },
                  children: config.headline,
                },
              },
              // CTA + website row
              {
                type: 'div' as const,
                props: {
                  style: {
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  },
                  children: [
                    config.cta ? {
                      type: 'div' as const,
                      props: {
                        style: {
                          backgroundColor: BRAND.gold,
                          color: BRAND.navy,
                          fontFamily: 'Bebas Neue',
                          fontSize: 20,
                          letterSpacing: '1.5px',
                          padding: '10px 28px',
                          borderRadius: 6,
                          textTransform: 'uppercase' as const,
                        },
                        children: config.cta,
                      },
                    } : null,
                    {
                      type: 'div' as const,
                      props: {
                        style: {
                          fontFamily: 'Bebas Neue',
                          fontSize: 16,
                          color: BRAND.gold,
                          letterSpacing: '2px',
                        },
                        children: 'hardenhvacr.com',
                      },
                    },
                  ].filter(Boolean),
                },
              },
            ],
          },
        },
      ].filter(Boolean),
    },
  };
}

// Instagram Story — Vertical template
function storyAd(config: AdConfig, bgBase64: string, dims: { width: number; height: number }) {
  const fontSize = getHeadlineSize(config.headline, dims.width, true);

  return {
    type: 'div' as const,
    props: {
      style: {
        width: dims.width,
        height: dims.height,
        display: 'flex',
        position: 'relative' as const,
        overflow: 'hidden',
        fontFamily: 'Bricolage Grotesque',
      },
      children: [
        // Background
        {
          type: 'img' as const,
          props: {
            src: bgBase64,
            style: {
              position: 'absolute' as const,
              top: 0,
              left: 0,
              width: dims.width,
              height: dims.height,
              objectFit: 'cover' as const,
            },
          },
        },
        // Gradient overlay — top and bottom
        {
          type: 'div' as const,
          props: {
            style: {
              position: 'absolute' as const,
              top: 0,
              left: 0,
              width: dims.width,
              height: dims.height,
              background: 'linear-gradient(to bottom, rgba(10,31,63,0.5) 0%, rgba(10,31,63,0.05) 25%, rgba(10,31,63,0.05) 60%, rgba(10,31,63,0.5) 80%, rgba(10,31,63,0.7) 100%)',
            },
          },
        },
        // Top — logo
        logoBase64 ? {
          type: 'div' as const,
          props: {
            style: {
              position: 'absolute' as const,
              top: 80,
              left: 0,
              width: dims.width,
              display: 'flex',
              justifyContent: 'center',
            },
            children: [{
              type: 'img' as const,
              props: {
                src: logoBase64,
                style: { width: 240, height: 'auto' },
              },
            }],
          },
        } : null,
        // Bottom content
        {
          type: 'div' as const,
          props: {
            style: {
              position: 'absolute' as const,
              bottom: 0,
              left: 0,
              width: dims.width,
              padding: '0 40px 120px',
              display: 'flex',
              flexDirection: 'column' as const,
              alignItems: 'center',
              textAlign: 'center' as const,
            },
            children: [
              {
                type: 'div' as const,
                props: {
                  style: {
                    width: 50,
                    height: 4,
                    backgroundColor: BRAND.gold,
                    marginBottom: 20,
                    borderRadius: 2,
                  },
                },
              },
              {
                type: 'div' as const,
                props: {
                  style: {
                    fontFamily: 'Bebas Neue',
                    fontSize,
                    lineHeight: 1.05,
                    color: BRAND.white,
                    letterSpacing: '2px',
                    textTransform: 'uppercase' as const,
                    textAlign: 'center' as const,
                    marginBottom: 28,
                    textShadow: '0 2px 8px rgba(0,0,0,0.5)',
                  },
                  children: config.headline,
                },
              },
              config.cta ? {
                type: 'div' as const,
                props: {
                  style: {
                    backgroundColor: BRAND.gold,
                    color: BRAND.navy,
                    fontFamily: 'Bebas Neue',
                    fontSize: 24,
                    letterSpacing: '2px',
                    padding: '14px 40px',
                    borderRadius: 8,
                    textTransform: 'uppercase' as const,
                    marginBottom: 16,
                  },
                  children: config.cta,
                },
              } : null,
              {
                type: 'div' as const,
                props: {
                  style: {
                    fontFamily: 'Bebas Neue',
                    fontSize: 16,
                    color: BRAND.gold,
                    letterSpacing: '3px',
                  },
                  children: 'hardenhvacr.com',
                },
              },
            ].filter(Boolean),
          },
        },
      ].filter(Boolean),
    },
  };
}

/**
 * Generates a complete ad creative by compositing:
 * 1. DALL-E background image
 * 2. Brand gradient overlay
 * 3. Headline text (Bebas Neue)
 * 4. CTA button
 * 5. Company logo
 * 6. Website URL
 *
 * Returns a PNG buffer of the final ad.
 */
export async function compositeAd(config: AdConfig): Promise<Buffer> {
  const dims = getDimensions(config.platform, config.contentType);

  // Download background image and convert to base64
  const bgRes = await fetch(config.backgroundImageUrl);
  const bgBuffer = Buffer.from(await bgRes.arrayBuffer());

  // Resize background to exact ad dimensions
  const resizedBg = await sharp(bgBuffer)
    .resize(dims.width, dims.height, { fit: 'cover' })
    .png()
    .toBuffer();

  const bgBase64 = `data:image/png;base64,${resizedBg.toString('base64')}`;

  // Pick template based on platform
  let template;
  if (config.platform === 'instagram' && config.contentType === 'story') {
    template = storyAd(config, bgBase64, dims);
  } else if (config.platform === 'instagram') {
    template = squareAd(config, bgBase64, dims);
  } else {
    template = landscapeAd(config, bgBase64, dims);
  }

  // Render with satori → SVG
  const svg = await satori(template as React.ReactNode, {
    width: dims.width,
    height: dims.height,
    fonts: [
      {
        name: 'Bebas Neue',
        data: bebasNeue,
        weight: 400,
        style: 'normal',
      },
      {
        name: 'Bricolage Grotesque',
        data: bricolage,
        weight: 400,
        style: 'normal',
      },
    ],
  });

  // SVG → PNG with resvg
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: dims.width },
  });
  const pngData = resvg.render();
  const pngBuffer = pngData.asPng();

  // Final sharp pass for optimization
  const optimized = await sharp(pngBuffer)
    .png({ quality: 95, compressionLevel: 6 })
    .toBuffer();

  return optimized;
}
