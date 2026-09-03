"""Resolve the three conflicts, keeping BOTH sides where both added something.

Measured by tmpres/show.py rather than read by eye:

  hunk 1  mine adds `setPhotosPublic` to the import; theirs adds nothing   -> MINE
  hunk 2  a pure addition of mine; theirs is empty                          -> MINE
  hunk 3  mine prepends the photo-visibility toggle; THEIRS added
          `__set_MY_PACE` / `mySpeedFtHr` to the shared dense line          -> MY LINES + THEIRS

Hunk 3 is the one that matters. Taking HEAD wholesale there would drop two identifiers main
added to a 2,000-character line — invisible in a diff, and exactly the silent revert this repo
keeps recording. So the shared trailing line comes from THEIR side, and only my genuinely new
lines are carried across.
"""
import io, sys

src = io.open("ClimbMatch.jsx", encoding="utf-8").read().split("\n")
out, i, hunk = [], 0, 0
SHARED = "const myCrewInvitesQ=useMyCrewInvites(uid);"

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

        if hunk in (1, 2):
            if theirs and any(t.strip() for t in theirs) and hunk == 2:
                sys.exit("hunk 2 was expected to be empty on their side; it is not")
            out.extend(head)
        elif hunk == 3:
            # my new lines are everything before the shared line; their copy of that line wins
            mine_new = [l for l in head if not l.startswith(SHARED)]
            their_shared = [l for l in theirs if l.startswith(SHARED)]
            if len(their_shared) != 1:
                sys.exit("expected exactly one shared myCrewInvitesQ line on their side, got %d" % len(their_shared))
            if not any("togglePhotosPublic" in l for l in mine_new):
                sys.exit("my new lines do not contain togglePhotosPublic — refusing")
            out.extend(mine_new)
            out.extend(theirs)
        else:
            sys.exit("unexpected hunk %d" % hunk)
        i = j + 1
        continue
    out.append(src[i])
    i += 1

if hunk != 3:
    sys.exit("expected 3 hunks, saw %d" % hunk)
txt = "\n".join(out)
for marker in ("<<<<<<<", "=======", ">>>>>>>"):
    if "\n" + marker in txt:
        sys.exit("a conflict marker survived: " + marker)
io.open("ClimbMatch.jsx", "w", encoding="utf-8").write(txt)
print("resolved 3 hunks")
