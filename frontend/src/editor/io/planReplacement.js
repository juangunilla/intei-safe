export const hasPlanImage = (document) => (document?.elements || []).some((element) => element.type === 'planImage');

export const hasPlanDependentData = (document) => Boolean(document?.scale?.calibrated)
  || Boolean(document?.measurements?.length)
  || Boolean(document?.sectors?.length)
  || Boolean(document?.simulations?.length)
  || (document?.elements || []).some((element) => element.routeId);

export const requiresPlanReplacementConfirmation = (document) => hasPlanImage(document) && hasPlanDependentData(document);

export const confirmPlanReplacement = (document, confirmReplacement) => (
  !requiresPlanReplacementConfirmation(document) || Boolean(confirmReplacement())
);
