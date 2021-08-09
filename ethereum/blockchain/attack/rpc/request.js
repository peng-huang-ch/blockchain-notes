const fetch = require('node-fetch');

function request(uri, method, params, id) {
  const body = {
    jsonrpc: '2.0',
    id: id || Date.now(),
    method,
    params,
  };
  return fetch(uri, {
    method: 'post',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
    .then((res) => res.json())
    .then((res) => {
      const { error, result } = res;
      if (error) throw error;
      return result;
    });
}

exports.request = request;
