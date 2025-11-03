exports.handler = async (event) => {
  const { password } = JSON.parse(event.body);
  const correctPassword = process.env.ACCESS_PASSWORD;

  if (password === correctPassword) {
    return {
      statusCode: 200,
      body: JSON.stringify({ authorized: true }),
    };
  } else {
    return {
      statusCode: 401,
      body: JSON.stringify({ authorized: false }),
    };
  }
};
