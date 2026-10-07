# Reference and attribution

This site directly adapts [joyehuang/blog](https://github.com/joyehuang/blog), by Joye Huang, at commit `17e0eda5d7befe82682072ba5e3b18991e80bc45`.

The template's page layouts, Header, home Section/LinkCard/SkillLayout, project sections, reading navigation, contact card, search, terminal/dev mode, public ASCII mascot fallback, style tokens, UnoCSS configuration, Markdown plugins and Satoshi fonts are reused. The template is distributed under Apache-2.0; its license is preserved in `LICENSE` and `public/licenses/joye-blog-LICENSE.txt`. [Satoshi](https://www.fontshare.com/fonts/satoshi) was designed by Deni Anggara for Indian Type Foundry and distributed through Fontshare under the [ITF Free Font License](https://www.fontshare.com/licenses/itf-ffl); the font files retained from the template remain subject to that font license.

Modified for Zaixi on 2026-10-01: personal content and navigation; static content/search/terminal APIs; legacy URL redirects; local image zoom; accessibility and responsive fixes; removal of the template author's analytics, comments, chatbot, sponsorship, paid consulting, private character dependency and personal content; dependency updates and compatibility adaptation for Astro 7 / Pure 1.4. Earlier custom page designs have been replaced by this direct template adaptation.

Articles, personal photographs and project descriptions are Zaixi's site content. Links to other projects do not imply ownership of their code or character artwork. PiLoop uses Pi's runtime; Nailong character artwork is excluded from that project's MIT code license. See the linked repositories for their licenses.

The Apache-2.0 template license does not grant rights to Zaixi's articles, personal photographs, QR code or referenced third-party artwork. Please credit the author and original source when quoting articles.

Added on 2026-10-02: article comments, replies and likes using [Waline](https://github.com/walinejs/waline), with an independent Vercel service and Neon PostgreSQL storage. At the user's request, the comment component's visual design, CSS and `public/icons/heart-item.svg` are now directly copied from the same joyehuang/blog template revision; adaptations retain Chinese locale, this site's server and article paths, lazy loading, recovery and keyboard access. This supersedes the initial removal of the template's comment design and the custom thumbs-up icon. The Waline client is distributed under MIT; the server and copied SQL schema retain Waline's GPL-2.0 license. These dependencies keep their own licenses; the template's Apache-2.0 license does not replace them. The homepage intro animation and replay controls have been removed.


## Alinerml adaptation — 2026-10-07

Adapted the template code from lizaixi01/lizaixi01.github.io at commit da95a425ff9863cb6850e4a43c8343042dd5ace3. Replaced all personal articles, project descriptions, photos, QR codes, personal identity, original service addresses and original artwork with Alinerml content. The prior author's personal assets and writings are excluded from this distribution. Retained the original template attribution, Apache-2.0 license and dependency notices.

Modified source: site data/config, homepage, About/Contact/Links/Projects pages, terminal profile text, metadata, search labels, content collections, comment configuration, build verification and deployment documentation. Added original engineering notes, practice records and a GitHub Pages Actions workflow. Avatar is the account owner's public GitHub avatar; no ownership of linked third-party projects is implied.
