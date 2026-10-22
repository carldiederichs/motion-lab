# Licensing and third-party sources

Motion Lab's original code is offered under the [MIT License](../LICENSE). The license permits use, modification and redistribution, including commercial use, provided its copyright and permission notices are retained. It does not give contributors access to merge changes into this repository.

MIT is a standard license that a copyright holder applies to work they have the right to license; it is not a purchased certificate or approval from MIT. See the [Open Source Initiative's MIT text](https://opensource.org/license/mit) and [GitHub's application instructions](https://choosealicense.com/licenses/mit/). Applying a license does not establish ownership of third-party material or grant rights the licensor does not have.

## Components included in the published files

| Component       | Scope                                                   | Notice and source                                                                                                                          |
| --------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Diagram Design  | Adapted diagram styling and authoring guidance          | [Retained MIT notice](THIRD-PARTY-LICENSE.txt); [upstream](https://github.com/cathrynlavery/diagram-design/blob/main/LICENSE)              |
| Primer Octicons | GitHub mark linking to the repository                   | [Retained MIT notice](OCTICONS-LICENSE.txt); [upstream](https://github.com/primer/octicons/blob/main/LICENSE)                              |
| Zod             | Input and document validation bundled into browser code | [Retained MIT notice](ZOD-LICENSE.txt), copied from the installed package; [upstream](https://github.com/colinhacks/zod/blob/main/LICENSE) |

The build embeds full notices in browser JavaScript and standalone lesson HTML. It also publishes `LICENSE.txt` and `THIRD-PARTY-NOTICES.txt`; the footer links to the notices. The GitHub SVG retains its notice in the asset itself. The downloadable toolkit includes these source notices. A build check rejects newly bundled packages until their licenses and distribution notices have been reviewed.

Development tools are installed separately from the pinned package lock and are not bundled into the hosted application or the toolkit archive. Their installed packages retain their own licenses. A dependency update must be reviewed again, including any change to Zod's license.

## Names, source links and artwork

The GitHub mark is secondary to Motion Lab's own branding and links to this repository, consistent with GitHub's [permitted project-link use](https://brand.github.com/foundations/logo). It does not imply endorsement.

LeetCode links identify the relevant external problems. The adjacent code icon is original geometric artwork, not LeetCode's logo. Earlier builds used Simple Icons artwork; its historical notice is retained, but current builds do not use it. [Simple Icons warns](https://github.com/simple-icons/simple-icons/blob/develop/DISCLAIMER.md) that its project license does not establish permissions for every brand icon. Copyright licenses and trademark permissions are separate.

The lesson text describes the exercises in our own words and uses synthetic examples. The original prompts and submissions remain on LeetCode. Motion Lab does not claim to license LeetCode's original questions, solutions, logos or trademarks, or to be affiliated with LeetCode. See [LeetCode's terms](https://leetcode.com/terms/).

## Review limits

This records the license files and published artifacts checked on 22 October 2026. It is not legal clearance or an independent determination of ownership of every contribution. Contributors must have the right to contribute their work. Questions about ownership, employment agreements, trademarks or third-party content require legal advice appropriate to the facts and jurisdiction.
