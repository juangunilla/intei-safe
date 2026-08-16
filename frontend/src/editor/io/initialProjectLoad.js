export const shouldApplyInitialProject = ({ requestToken, currentToken, documentAtStart, currentDocument }) => (
  requestToken === currentToken && documentAtStart === currentDocument
);
