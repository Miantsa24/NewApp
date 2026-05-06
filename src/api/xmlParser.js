import { XMLParser } from 'fast-xml-parser'

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
})

export const parseXML = (xmlString) => {
  return parser.parse(xmlString)
}