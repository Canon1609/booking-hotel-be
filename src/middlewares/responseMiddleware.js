// Middleware to ensure every JSON response includes a statusCode field
module.exports = (req, res, next) => {
  const originalJson = res.json.bind(res);

  res.json = function (body) {
    if (body && typeof body === 'object' && body.statusCode === undefined) {
      body.statusCode = res.statusCode;
    }
    return originalJson(body);
  };

  next();
};


