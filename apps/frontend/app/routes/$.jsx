import NotFound from "./_404";

export const loader = async () => {
  return new Response({ message: "Not Found" }, { status: 200 });
};

export const action = async () => {
  return new Response({ message: "Not Found" }, { status: 200 });
};

export default NotFound;