// const metadata = require("./metadata.json");
// const initialOrder = require("./order.json");

exports.onCreateWebpackConfig = ({ actions }) => {
    actions.setWebpackConfig({
        experiments: {
            asyncWebAssembly: true,
        },
    });
};

exports.createPages = async ({ actions: { createPage } }) => {
    // const spacebudz = getSpacebudz();
    createPage({
      path: `/trade`,
      component: require.resolve("./src/templates/offer.js"),
      context: {},
    });
  };