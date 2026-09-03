"""Show what each side of every conflict hunk adds that the other lacks.

A dense line resolved by eye is how this repo loses merged work. Compare the two sides as SETS
of tokens: whatever only HEAD has is mine, whatever only origin/main has is theirs, and the
resolution has to keep both.
"""
import io, re, sys

src = io.open("ClimbMatch.jsx", encoding="utf-8").read().split("\n")
i = 0
hunk = 0
while i < len(src):
    if src[i].startswith("<<<<<<<"):
        hunk += 1
        j = i + 1
        head = []
        while not src[j].startswith("======="):
            head.append(src[j]); j += 1
        j += 1
        theirs = []
        while not src[j].startswith(">>>>>>>"):
            theirs.append(src[j]); j += 1
        h, t = "\n".join(head), "\n".join(theirs)
        tok = lambda s: set(re.findall(r"[A-Za-z_$][A-Za-z0-9_$]{2,}", s))
        only_h = sorted(tok(h) - tok(t))
        only_t = sorted(tok(t) - tok(h))
        print("── hunk %d (line %d) ── HEAD %d chars, theirs %d chars" % (hunk, i + 1, len(h), len(t)))
        print("   only in MINE  : " + (", ".join(only_h) or "(nothing)"))
        print("   only in THEIRS: " + (", ".join(only_t) or "(nothing)"))
        print()
        i = j
    i += 1
print("total hunks:", hunk)
