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

function toASM(chunks) {
  const separator = ' ';
  if (Buffer.isBuffer(chunks)) {
    chunks = decompile(chunks);
  }

  return chunks
    .map((chunk) => {
      if (Buffer.isBuffer(chunk)) {
        const op = asMinimalOP(chunk);
        if (op === undefined) return chunk.toString('hex');

        chunk = op;
      }

      return REVERSE_OPS[chunk];
    })
    .join(separator);
}

function decompile(buffer) {
  if (typeforce.Array(buffer)) return buffer;

  typeforce(typeforce.Buffer, buffer);

  const chunks = [];
  let i = 0;
  while (i < buffer.length) {
    const opcode = buffer[i];

    // data chunk
    if (opcode > OPS.OP_0 && opcode <= OPS.OP_PUSHDATA4) {
      const d = pushdata.decode(buffer, i);

      if (d === null) return null;

      i += d.size;
      if (i + d.number > buffer.length) return null;

      const data = buffer.slice(i, i + d.number);
      i += d.number;

      const op = asMinimalOP(data);
      if (op !== undefined) {
        chunks.push(op);
      } else {
        chunks.push(data);
      }
    } else {
      chunks.push(opcode);
      i += 1;
    }
  }

  return chunks;
}

module.exports = {
  compile,
  decompile,
  asMinimalOP,
  fromASM,
  toASM,
};
