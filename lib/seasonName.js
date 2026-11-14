/* The uploader's caption box. Saves on an explicit tap and says what happened, like PhotoDescribeBox:
   "Caption saved" only once the write resolved. A plain text area (useRichTextareas grows it) with no
   maxLength, and the database column has no cap either. */
export function seasonName(d){var m=parseInt((d||"").slice(5,7),10)||0;return (m>=12||m<=2)?"Winter":m<=5?"Spring":m<=8?"Summer":"Fall";}
