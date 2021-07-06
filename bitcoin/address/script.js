const typeforce = require('typeforce');
const OPS = require('bitcoin-ops');
const pushdata = require('pushdata-bitcoin');
const REVERSE_OPS = require('bitcoin-ops/map');
const OP_INT_BASE = OPS.OP_RESERVED; // OP_1 - 1

function asMinimalOP(buffer) {
  if (buffer.length === 0) return OPS.OP_0;
  if (buffer.length !== 1) return;
  if (buffer[0] >= 1 && buffer[0] <= 16) return OP_INT_BASE + buffer[0];
  if (buffer[0] === 0x81) return OPS.OP_1NEGATE;
}

function compile(chunks) {
  if (Buffer.isBuffer(chunks)) return chunks;
  typeforce(typeforce.Array, chunks);

  const bufferSize = chunks.reduce((accum, chunk) => {
    // data chunk
    if (Buffer.isBuffer(chunk)) {
      // adhere to BIP62.3, minimal push policy
      if (chunk.length === 1 && asMinimalOP(chunk) !== undefined) {
        return accum + 1;
      }

      return accum + pushdata.encodingLength(chunk.length) + chunk.length;
    }

    // opcode
    return accum + 1;
  }, 0.0);

  const buffer = Buffer.allocUnsafe(bufferSize);
  let offset = 0;
  chunks.forEach((chunk) => {
    // data chunk
    if (Buffer.isBuffer(chunk)) {
      // adhere to BIP62.3, minimal push policy
      const opcode = asMinimalOP(chunk);
      if (opcode !== undefined) {
        buffer.writeUInt8(opcode, offset);
        offset += 1;
        return;
      }

      offset += pushdata.encode(buffer, chunk.length, offset);
      chunk.copy(buffer, offset);
      offset += chunk.length;

      // opcode
    } else {
      buffer.writeUInt8(chunk, offset);
      offset += 1;
    }
  });

  if (offset !== buffer.length) throw new Error('Could not decode chunks');
  return buffer;
}

function fromASM(asm) {
  const separator = ' ';
  typeforce(typeforce.String, asm);
  const chunks = asm.split(separator).map((str) => {
    // opcode
    if (OPS[str] !== undefined) return OPS[str];

    typeforce(typeforce.Hex, str);

    return Buffer.from(str, 'hex');
  });
  return compile(chunks);
}

module.exports = {
  compile,
  asMinimalOP,
  fromASM,
};
