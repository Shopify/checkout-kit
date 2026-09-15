# swift-api-digester visits declarations from separate files/extensions in build
# order. Canonicalize declaration lists at the module and every nested type.
# Stored properties and enum cases retain their relative order; their layout can
# matter. Unknown node kinds also retain their order rather than assuming safety.
# Never sort type/parameter children, conformances, or other metadata arrays.
def unordered_declaration:
  .hasStorage != true and .declKind != "EnumElement" and
  (.kind | IN("Constructor", "Function", "TypeAlias", "TypeDecl", "Var"));

walk(
  if type == "object" and (.kind == "Root" or .kind == "TypeDecl") and
     (.children | type) == "array" then
    .children |= (
      map(select(unordered_declaration | not)) +
      (map(select(unordered_declaration)) | sort_by(.kind, .printedName, .usr))
    )
  else . end
)
