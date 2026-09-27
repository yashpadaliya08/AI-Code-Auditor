export interface CweDefinition {
  id: string;
  name: string;
  category: string;
  description: string;
}

export const COMMON_CWES: Record<string, CweDefinition> = {
  'CWE-89': {
    id: 'CWE-89',
    name: 'Improper Neutralization of Special Elements used in an SQL Command (SQL Injection)',
    category: 'Injection',
    description: 'The software constructs an SQL command using externally-influenced input from an upstream component.',
  },
  'CWE-78': {
    id: 'CWE-78',
    name: 'Improper Neutralization of Special Elements used in an OS Command (OS Command Injection)',
    category: 'Injection',
    description: 'The software constructs an OS command using externally-influenced input.',
  },
  'CWE-79': {
    id: 'CWE-79',
    name: 'Improper Neutralization of Input During Web Page Generation (Cross-site Scripting)',
    category: 'Injection',
    description: 'The software does not neutralize or incorrectly neutralizes user-controllable input before it is placed in output.',
  },
  'CWE-798': {
    id: 'CWE-798',
    name: 'Use of Hard-coded Credentials',
    category: 'Cryptographic',
    description: 'The software contains hard-coded credentials, such as a password or cryptographic key.',
  },
  'CWE-284': {
    id: 'CWE-284',
    name: 'Improper Access Control',
    category: 'Access Control',
    description: 'The software does not restrict or incorrectly restricts access to a resource from an unauthorized actor.',
  },
  'CWE-918': {
    id: 'CWE-918',
    name: 'Server-Side Request Forgery (SSRF)',
    category: 'Network',
    description: 'The web server receives a URL or similar request from an upstream component and retrieves the contents of this URL.',
  },
  'CWE-400': {
    id: 'CWE-400',
    name: 'Uncontrolled Resource Consumption',
    category: 'Performance',
    description: 'The software does not properly control the allocation and maintenance of a limited resource.',
  },
  'CWE-776': {
    id: 'CWE-776',
    name: 'Improper Restriction of Recursive Entity References in DTDs (XML Entity Expansion)',
    category: 'Data Processing',
    description: 'The software parses an XML document that can contain XML entities with URIs that resolve to documents outside of the intended sphere of control.',
  },
  'CWE-1068': {
    id: 'CWE-1068',
    name: 'Inconsistency Between Implementation and Documented Design',
    category: 'Architecture',
    description: 'The code deviates from documented architectural invariants or exposes silent failure modes.',
  },
};
