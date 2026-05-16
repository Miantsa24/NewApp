import { XMLParser } from 'fast-xml-parser'

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
})

export const parseXML = (xmlString) => {
  // PrestaShop peut sortir des warnings PHP avant le XML (ex: "headers already sent").
  // On retire tout ce qui précède la déclaration XML pour éviter "Pi Tag is not closed".
  const xmlStart = typeof xmlString === 'string' ? xmlString.indexOf('<?xml') : -1
  const clean = xmlStart > 0 ? xmlString.slice(xmlStart) : xmlString
  return parser.parse(clean)
}