export const LANG_FILE_CONTENTS={"__init__.py":'from magmascript.lang.tokens import TokenType, Token, KEYWORDS\nfrom magmascript.lang.lexer import Lexer\nfrom magmascript.lang.ast_nodes import *\nfrom magmascript.lang.parser import Parser\nfrom magmascript.lang.interpreter import Interpreter\nfrom magmascript.lang.environment import Environment\nfrom magmascript.lang.builtins import BUILTINS\nfrom magmascript.lang.domain_bridge import create_domain_proxies\n\n__all__ = [\n    "TokenType",\n    "Token",\n    "KEYWORDS",\n    "Lexer",\n    "Parser",\n    "Interpreter",\n    "Environment",\n    "BUILTINS",\n    "create_domain_proxies",\n]\n',"ast_nodes.py":'from __future__ import annotations\n\nfrom dataclasses import dataclass, field\nfrom typing import Any\n\n\n@dataclass\nclass ASTNode:\n    line: int = 0\n    column: int = 0\n\n\n@dataclass\nclass Program(ASTNode):\n    body: list[ASTNode] = field(default_factory=list)\n\n\n@dataclass\nclass Block(ASTNode):\n    body: list[ASTNode] = field(default_factory=list)\n\n\n@dataclass\nclass NumberLiteral(ASTNode):\n    value: int | float = 0\n\n\n@dataclass\nclass StringLiteral(ASTNode):\n    value: str = ""\n    interpolated: bool = False\n    parts: list[Any] = field(default_factory=list)\n\n\n@dataclass\nclass BoolLiteral(ASTNode):\n    value: bool = False\n\n\n@dataclass\nclass NoneLiteral(ASTNode):\n    pass\n\n\n@dataclass\nclass Identifier(ASTNode):\n    name: str = ""\n\n\n@dataclass\nclass BinaryOp(ASTNode):\n    op: str = ""\n    left: ASTNode = field(default_factory=ASTNode)\n    right: ASTNode = field(default_factory=ASTNode)\n\n\n@dataclass\nclass UnaryOp(ASTNode):\n    op: str = ""\n    operand: ASTNode = field(default_factory=ASTNode)\n\n\n@dataclass\nclass Assignment(ASTNode):\n    name: str = ""\n    value: ASTNode = field(default_factory=ASTNode)\n    op: str = "="\n\n\n@dataclass\nclass PropertyAccess(ASTNode):\n    object: ASTNode = field(default_factory=ASTNode)\n    property: str = ""\n\n\n@dataclass\nclass IndexAccess(ASTNode):\n    object: ASTNode = field(default_factory=ASTNode)\n    index: ASTNode = field(default_factory=ASTNode)\n\n\n@dataclass\nclass Slice(ASTNode):\n    start: ASTNode | None = None\n    stop: ASTNode | None = None\n    step: ASTNode | None = None\n\n\n@dataclass\nclass FunctionCall(ASTNode):\n    callee: ASTNode = field(default_factory=ASTNode)\n    arguments: list[ASTNode] = field(default_factory=list)\n\n\n@dataclass\nclass MethodCall(ASTNode):\n    object: ASTNode = field(default_factory=ASTNode)\n    method: str = ""\n    arguments: list[ASTNode] = field(default_factory=list)\n\n\n@dataclass\nclass IfExpression(ASTNode):\n    condition: ASTNode = field(default_factory=ASTNode)\n    then_block: ASTNode = field(default_factory=ASTNode)\n    else_block: ASTNode | None = None\n\n\n@dataclass\nclass ForLoop(ASTNode):\n    variable: str = ""\n    iterable: ASTNode = field(default_factory=ASTNode)\n    body: ASTNode = field(default_factory=ASTNode)\n\n\n@dataclass\nclass WhileLoop(ASTNode):\n    condition: ASTNode = field(default_factory=ASTNode)\n    body: ASTNode = field(default_factory=ASTNode)\n\n\n@dataclass\nclass FunctionDef(ASTNode):\n    name: str = ""\n    params: list[str] = field(default_factory=list)\n    defaults: dict[str, ASTNode] = field(default_factory=dict)\n    body: ASTNode = field(default_factory=ASTNode)\n\n\n@dataclass\nclass ArrowFunction(ASTNode):\n    params: list[str] = field(default_factory=list)\n    defaults: dict[str, ASTNode] = field(default_factory=dict)\n    body: ASTNode = field(default_factory=ASTNode)\n\n\n@dataclass\nclass ReturnStatement(ASTNode):\n    value: ASTNode | None = None\n\n\n@dataclass\nclass BreakStatement(ASTNode):\n    pass\n\n\n@dataclass\nclass ContinueStatement(ASTNode):\n    pass\n\n\n@dataclass\nclass ListLiteral(ASTNode):\n    elements: list[ASTNode] = field(default_factory=list)\n\n\n@dataclass\nclass DictLiteral(ASTNode):\n    keys: list[ASTNode] = field(default_factory=list)\n    values: list[ASTNode] = field(default_factory=list)\n\n\n@dataclass\nclass ListComprehension(ASTNode):\n    element: ASTNode = field(default_factory=ASTNode)\n    variable: str = ""\n    iterable: ASTNode = field(default_factory=ASTNode)\n    condition: ASTNode | None = None\n\n\n@dataclass\nclass InterpolatedString(ASTNode):\n    parts: list[ASTNode] = field(default_factory=list)\n\n\n@dataclass\nclass ExprStatement(ASTNode):\n    expr: ASTNode = field(default_factory=ASTNode)\n\n\n@dataclass\nclass PrintStatement(ASTNode):\n    arguments: list[ASTNode] = field(default_factory=list)\n\n\n@dataclass\nclass SpookedStatement(ASTNode):\n    message: ASTNode = field(default_factory=StringLiteral)\n\n\n@dataclass\nclass ImportStatement(ASTNode):\n    module: str = ""\n    names: list[str] = field(default_factory=list)\n    alias: str = ""\n    from_import: bool = False\n\n\n@dataclass\nclass TryCatch(ASTNode):\n    try_block: ASTNode = field(default_factory=Block)\n    catch_param: str = ""\n    catch_block: ASTNode = field(default_factory=Block)\n\n\n@dataclass\nclass ThrowStatement(ASTNode):\n    error_type: str = "fire toad"\n    message: ASTNode = field(default_factory=StringLiteral)\n\n\n@dataclass\nclass ClassDef(ASTNode):\n    name: str = ""\n    methods: list[FunctionDef] = field(default_factory=list)\n\n\n@dataclass\nclass PropertyAssignment(ASTNode):\n    object: ASTNode = field(default_factory=ASTNode)\n    property: str = ""\n    value: ASTNode = field(default_factory=ASTNode)\n    op: str = "="\n\n\n@dataclass\nclass FloorplanField(ASTNode):\n    name: str = ""\n    type_name: str = ""\n    count: int = 1\n    points_to: str = ""\n\n\n@dataclass\nclass FloorplanDef(ASTNode):\n    name: str = ""\n    fields: list[FloorplanField] = field(default_factory=list)\n\n\n@dataclass\nclass IndexAssignment(ASTNode):\n    object: ASTNode = field(default_factory=ASTNode)\n    index: ASTNode = field(default_factory=ASTNode)\n    value: ASTNode = field(default_factory=ASTNode)\n    op: str = "="\n\n\n@dataclass\nclass MultiAssignment(ASTNode):\n    targets: list[str] = field(default_factory=list)\n    values: list[ASTNode] = field(default_factory=list)\n    op: str = "="\n',"astheno/__init__.py":'"""The Asthenosphere - MagmaScript\'s explicit-memory tier.\n\nThe layer beneath the lithosphere. Where the dynamic tier hands you Python\nobjects and a garbage collector, this one hands you bytes and a shovel, then\nnarrates every mistake you make with them.\n"""\n\nfrom __future__ import annotations\n\nfrom typing import Any\n\nfrom magmascript.lang.astheno.numeric import (\n    SPECS,\n    AsthenoTypeError,\n    Fixed,\n    NumSpec,\n    binary_op,\n    coerce,\n    negate,\n    set_warn_hook,\n    warn,\n)\nfrom magmascript.lang.astheno.arena import (\n    Arena,\n    AreaDoesNotExist,\n    AsthenoError,\n    Block,\n    Pine,\n    Quicksand,\n    current_site,\n    set_site_hook,\n)\nfrom magmascript.lang.astheno.dump import arena_summary, bathysphere, leak_report\n\n\nclass SpecHandle:\n    """A width, usable as both a constructor and a type reference.\n\n    ``i32(5)`` builds a value; ``osmosis(x, i32)`` and ``p.peek(i32)`` pass the\n    same name as a type. One object serves both so there is only one spelling\n    of a width in the language.\n    """\n\n    __slots__ = ("spec",)\n\n    def __init__(self, spec: NumSpec) -> None:\n        self.spec = spec\n\n    def __call__(self, value: Any = 0) -> Fixed:\n        return coerce(value, self.spec, context=f"{self.spec.name}()")\n\n    def __repr__(self) -> str:\n        return self.spec.name\n\n    def __str__(self) -> str:\n        return self.spec.name\n\n\nSPEC_HANDLES: dict[str, SpecHandle] = {\n    name: SpecHandle(spec) for name, spec in SPECS.items()\n}\n\n\ndef resolve_spec(value: Any, *, who: str) -> NumSpec:\n    """Accept a SpecHandle, a NumSpec, or a width\'s name."""\n    if isinstance(value, SpecHandle):\n        return value.spec\n    if isinstance(value, NumSpec):\n        return value\n    if isinstance(value, str) and value in SPECS:\n        return SPECS[value]\n    known = ", ".join(SPECS)\n    raise AsthenoTypeError(f"{who} expected a width ({known}), got {value!r}")\n\n\ndef builtin_osmosis(value: Any, spec: Any) -> Fixed:\n    """Convert between widths explicitly, reporting anything lost."""\n    target = resolve_spec(spec, who="osmosis()")\n    origin = value.spec.name if isinstance(value, Fixed) else type(value).__name__\n    return coerce(value, target, context=f"osmosis({origin} -> {target.name})")\n\n\ndef builtin_widthof(value: Any) -> int:\n    """Bytes occupied by a fixed-width value or width."""\n    if isinstance(value, Fixed):\n        return value.spec.bits // 8\n    return resolve_spec(value, who="widthof()").bits // 8\n\n\n# One arena per running program. The interpreter swaps this in and out around\n# run(), the same way it does the warning hook, so a script cannot see another\n# script\'s memory and tests stay isolated.\n_arena: Arena | None = None\n\n\ndef set_arena(arena: Arena | None) -> Arena | None:\n    global _arena\n    previous = _arena\n    _arena = arena\n    return previous\n\n\ndef current_arena() -> Arena:\n    global _arena\n    if _arena is None:\n        _arena = Arena()\n    return _arena\n\n\ndef builtin_garrison(what: Any = None) -> Pine:\n    """Claim ground. Takes a byte count or a floorplan."""\n    fields = getattr(what, "fields", None)\n    if fields is not None:\n        pine = current_arena().garrison(what.size, label=what.name)\n        return pine.typed(what)\n    if isinstance(what, Fixed):\n        what = what.value\n    if isinstance(what, bool) or not isinstance(what, int):\n        raise AsthenoError(\n            f"garrison() expected a byte count or a floorplan, "\n            f"got {type(what).__name__}"\n        )\n    return current_arena().garrison(what)\n\n\ndef builtin_scorch(pine: Any) -> None:\n    if not isinstance(pine, Pine):\n        raise AsthenoError(f"scorch() expected a pine, got {type(pine).__name__}")\n    current_arena().scorch(pine)\n\n\ndef builtin_bathysphere(pine: Any) -> None:\n    print(bathysphere(pine))\n\n\ndef builtin_arena() -> None:\n    print(arena_summary(current_arena()))\n\n\ndef builtin_sizeof(what: Any) -> int:\n    size = getattr(what, "size", None)\n    if size is not None and getattr(what, "fields", None) is not None:\n        return size\n    if isinstance(what, Pine):\n        return what.size\n    return builtin_widthof(what)\n\n\ndef builtin_alignof(what: Any) -> int:\n    align = getattr(what, "align", None)\n    if align is not None:\n        return align\n    return builtin_widthof(what)\n\n\ndef builtin_layout(what: Any) -> None:\n    from magmascript.lang.astheno.floorplan import describe_layout\n\n    print(describe_layout(what))\n\n\nASTHENO_BUILTINS: dict[str, Any] = {\n    **SPEC_HANDLES,\n    "osmosis": builtin_osmosis,\n    "widthof": builtin_widthof,\n    "garrison": builtin_garrison,\n    "scorch": builtin_scorch,\n    "bathysphere": builtin_bathysphere,\n    "arena": builtin_arena,\n    "sizeof": builtin_sizeof,\n    "alignof": builtin_alignof,\n    "layout": builtin_layout,\n}\n\n__all__ = [\n    "ASTHENO_BUILTINS",\n    "Arena",\n    "AreaDoesNotExist",\n    "AsthenoError",\n    "Block",\n    "Pine",\n    "Quicksand",\n    "arena_summary",\n    "bathysphere",\n    "current_arena",\n    "current_site",\n    "leak_report",\n    "set_arena",\n    "set_site_hook",\n    "SPECS",\n    "SPEC_HANDLES",\n    "AsthenoTypeError",\n    "Fixed",\n    "NumSpec",\n    "SpecHandle",\n    "binary_op",\n    "coerce",\n    "negate",\n    "resolve_spec",\n    "set_warn_hook",\n    "warn",\n]\n',"astheno/arena.py":'"""The arena - real bytes, real pointers, and a running commentary.\n\nA ``Pine`` is a pointer: an offset into one ``Arena``\'s ``bytearray``, carrying\nthe extent of the block it came from. Every read and write is checked against\nthat extent, and every allocation remembers the line that made it.\n\nTwo deliberate departures from a real allocator, both in service of the\ndiagnostics:\n\n* **Blocks are never reused.** A bump allocator hands out fresh ground every\n  time. In C, whether a use-after-free explodes depends on what has since been\n  written over the block - which is exactly why the bug is so hard to pin down.\n  Here a scorched block stays scorched, so the error fires every time, at the\n  line that caused it, naming the line that scorched it.\n* **Freed blocks keep their contents.** Nothing is zeroed on scorch, so a hex\n  dump of a scorched block still shows what was there. Reading it is an error;\n  looking at it from outside the program is not.\n"""\n\nfrom __future__ import annotations\n\nfrom dataclasses import dataclass, field\nfrom typing import Any, Callable\n\nfrom magmascript.lang.astheno.numeric import Fixed, NumSpec, _wrap_int, coerce\n\nALIGNMENT = 8\n\n# The first bytes of every arena are reserved and never handed out, so offset 0\n# can mean "points at nothing" - the same trick as an unmapped zero page.\nNULL_ZONE = 8\n\n\nclass AsthenoError(Exception):\n    """An Asthenosphere fault, carrying the vocabulary it reports under."""\n\n    prefix = "fire toad"\n\n\nclass Quicksand(AsthenoError):\n    """Ground that looks solid and isn\'t - a scorched block, touched again."""\n\n    prefix = "quicksand"\n\n\nclass AreaDoesNotExist(AsthenoError):\n    """An access outside the block it claims to be inside."""\n\n    prefix = "area does not exist"\n\n\n# The interpreter installs this so allocations can record the line that made\n# them. Without a hook, sites are reported as unknown.\n_site_hook: Callable[[], int] | None = None\n\n\ndef set_site_hook(fn: Callable[[], int] | None) -> Callable[[], int] | None:\n    global _site_hook\n    previous = _site_hook\n    _site_hook = fn\n    return previous\n\n\ndef current_site() -> int:\n    return _site_hook() if _site_hook is not None else 0\n\n\ndef _at(line: int) -> str:\n    return f"line {line}" if line else "an unknown line"\n\n\n@dataclass\nclass Block:\n    offset: int\n    size: int\n    alive: bool = True\n    garrisoned_at: int = 0\n    scorched_at: int = 0\n    label: str = ""\n\n\n@dataclass\nclass Arena:\n    """One contiguous region of bytes plus the bookkeeping to explain it."""\n\n    data: bytearray = field(default_factory=lambda: bytearray(NULL_ZONE))\n    blocks: dict[int, Block] = field(default_factory=dict)\n\n    def block_containing(self, offset: int) -> Block | None:\n        for block in self.blocks.values():\n            if block.offset <= offset < block.offset + block.size:\n                return block\n        return None\n\n    def garrison(self, size: int, label: str = "") -> "Pine":\n        if size <= 0:\n            raise AsthenoError(f"garrison() needs a positive size, got {size}")\n        offset = len(self.data)\n        padding = (-offset) % ALIGNMENT\n        if padding:\n            self.data.extend(b"\\x00" * padding)\n            offset += padding\n        self.data.extend(b"\\x00" * size)\n        block = Block(offset=offset, size=size, garrisoned_at=current_site(), label=label)\n        self.blocks[offset] = block\n        return Pine(offset, self, block)\n\n    def scorch(self, pine: "Pine") -> None:\n        block = pine.block\n        if pine.offset != block.offset:\n            raise AsthenoError(\n                f"scorch() needs the pine that garrison() returned - this one "\n                f"points {pine.offset - block.offset} bytes into its block"\n            )\n        if not block.alive:\n            raise Quicksand(\n                f"this ground was already scorched at {_at(block.scorched_at)}"\n            )\n        block.alive = False\n        block.scorched_at = current_site()\n\n    def live_blocks(self) -> list[Block]:\n        return [b for b in self.blocks.values() if b.alive]\n\n    def total_garrisoned(self) -> int:\n        return sum(b.size for b in self.blocks.values())\n\n\n@dataclass(frozen=True)\nclass Pine:\n    """A pointer: where it points, and the block that bounds it."""\n\n    offset: int\n    arena: Arena = field(repr=False, compare=False)\n    block: Block = field(repr=False, compare=False)\n    spec: Any = None\n\n    # --- checking -------------------------------------------------------\n\n    def _check(self, at: int, nbytes: int) -> int:\n        block = self.block\n        if not block.alive:\n            raise Quicksand(\n                f"this ground was scorched at {_at(block.scorched_at)} "\n                f"(garrisoned at {_at(block.garrisoned_at)})"\n            )\n        start = self.offset + at\n        end = start + nbytes\n        if start < block.offset or end > block.offset + block.size:\n            rel = start - block.offset\n            raise AreaDoesNotExist(\n                f"byte {rel}..{rel + nbytes - 1} is outside this pine\'s block, "\n                f"which covers 0..{block.size - 1} "\n                f"({block.size} bytes garrisoned at {_at(block.garrisoned_at)})"\n            )\n        return start\n\n    # --- typed access ---------------------------------------------------\n\n    def peek(self, spec: Any = None, at: int = 0) -> Fixed:\n        from magmascript.lang.astheno import resolve_spec\n\n        resolved = resolve_spec(spec if spec is not None else self.spec, who="peek()")\n        nbytes = resolved.bits // 8\n        start = self._check(at, nbytes)\n        raw = bytes(self.arena.data[start:start + nbytes])\n        return _decode(raw, resolved)\n\n    def poke(self, spec: Any, value: Any = None, at: int = 0) -> Any:\n        from magmascript.lang.astheno import resolve_spec\n\n        # poke(value) is allowed on a typed pine; poke(spec, value) otherwise.\n        if value is None and self.spec is not None and not _looks_like_spec(spec):\n            value, spec = spec, self.spec\n        resolved = resolve_spec(spec, who="poke()")\n        nbytes = resolved.bits // 8\n        start = self._check(at, nbytes)\n        fixed = coerce(value, resolved, context="poke()")\n        self.arena.data[start:start + nbytes] = _encode(fixed, resolved)\n        return fixed\n\n    # --- raw byte access ------------------------------------------------\n\n    def read_byte(self, index: int) -> int:\n        start = self._check(index, 1)\n        return self.arena.data[start]\n\n    def write_byte(self, index: int, value: Any) -> int:\n        start = self._check(index, 1)\n        raw = value.value if isinstance(value, Fixed) else value\n        if not isinstance(raw, int) or isinstance(raw, bool):\n            raise AsthenoError(\n                f"a byte must be an integer, got {type(value).__name__}"\n            )\n        self.arena.data[start] = raw & 0xFF\n        return raw & 0xFF\n\n    # --- arithmetic -----------------------------------------------------\n\n    def shifted(self, delta: int) -> "Pine":\n        return Pine(self.offset + delta, self.arena, self.block, self.spec)\n\n    def typed(self, spec: Any) -> "Pine":\n        return Pine(self.offset, self.arena, self.block, spec)\n\n    @property\n    def alive(self) -> bool:\n        return self.block.alive\n\n    @property\n    def size(self) -> int:\n        """Bytes remaining in the block from where this pine points."""\n        return self.block.offset + self.block.size - self.offset\n\n    def __len__(self) -> int:\n        return self.size\n\n    def __str__(self) -> str:\n        state = "alive" if self.block.alive else "scorched"\n        return f"pine 0x{self.offset:04x} ({self.size} bytes, {state})"\n\n    def __repr__(self) -> str:\n        return self.__str__()\n\n\ndef _looks_like_spec(value: Any) -> bool:\n    from magmascript.lang.astheno import SpecHandle\n\n    return isinstance(value, (SpecHandle, NumSpec)) or (\n        isinstance(value, str) and value in __import__(\n            "magmascript.lang.astheno.numeric", fromlist=["SPECS"]\n        ).SPECS\n    )\n\n\ndef _encode(fixed: Fixed, spec: NumSpec) -> bytes:\n    import struct\n\n    if spec.is_float:\n        return struct.pack("<f" if spec.bits == 32 else "<d", float(fixed.value))\n    return int(fixed.value).to_bytes(\n        spec.bits // 8, "little", signed=spec.signed\n    )\n\n\ndef _decode(raw: bytes, spec: NumSpec) -> Fixed:\n    import struct\n\n    if spec.is_float:\n        return Fixed(struct.unpack("<f" if spec.bits == 32 else "<d", raw)[0], spec)\n    return Fixed(int.from_bytes(raw, "little", signed=spec.signed), spec)\n',"astheno/dump.py":`"""bathysphere() - descend and look at the bytes.

A sealed vessel you take down to observe the deep safely. The dump shows the
raw bytes, their ASCII reading, and - when the pine carries a floorplan - which
field each run of bytes belongs to and what it currently decodes to.

Padding is drawn too. A struct that wastes eight bytes to alignment shows those
eight bytes, which turns "reorder your fields" from folklore into something you
can point at.
"""

from __future__ import annotations

from typing import Any

from magmascript.lang.astheno.arena import Arena, Pine
from magmascript.lang.astheno.numeric import Fixed

BYTES_PER_ROW = 16
GROUP = 4


def _column_of(index: int) -> int:
    """Character column where byte \`index\` starts within a hex row."""
    return index * 3 + index // GROUP


def _hex_row(data: bytes) -> str:
    out = []
    for i, byte in enumerate(data):
        if i and i % GROUP == 0:
            out.append(" ")
        out.append(f"{byte:02x} ")
    return "".join(out).rstrip()


def _ascii_row(data: bytes) -> str:
    return "".join(chr(b) if 32 <= b < 127 else "." for b in data)


def _at(line: int) -> str:
    return f"line {line}" if line else "an unknown line"


def _field_runs(pine: Pine) -> list[tuple[int, int, str]]:
    """(start, length, label) for each field and padding gap in a floorplan."""
    plan = getattr(pine.spec, "fields", None)
    if plan is None:
        return []
    runs: list[tuple[int, int, str]] = []
    cursor = 0
    for field in plan:
        if field.offset > cursor:
            runs.append((cursor, field.offset - cursor, "(padding)"))
        label = f"{field.name}: {field.type_name}"
        try:
            value = field.read(pine)
        except Exception:
            value = None
        if value is not None:
            label += f" = {value}"
        runs.append((field.offset, field.size, label))
        cursor = field.offset + field.size
    size = getattr(pine.spec, "size", cursor)
    if size > cursor:
        runs.append((cursor, size - cursor, "(tail padding)"))
    return runs


def bathysphere(pine: Pine) -> str:
    """Render \`pine\`'s block as annotated hex."""
    if not isinstance(pine, Pine):
        raise TypeError(f"bathysphere() expected a pine, got {type(pine).__name__}")

    block = pine.block
    state = "alive" if block.alive else f"scorched at {_at(block.scorched_at)}"
    name = getattr(pine.spec, "name", None)
    heading = f"pine 0x{pine.offset:04x}"
    if name:
        heading += f" -> {name}"
    heading += (
        f" ({block.size} bytes, {state}, garrisoned at {_at(block.garrisoned_at)})"
    )

    data = bytes(pine.arena.data[block.offset:block.offset + block.size])
    runs = _field_runs(pine)
    lines = [heading]

    for row_start in range(0, len(data), BYTES_PER_ROW):
        row = data[row_start:row_start + BYTES_PER_ROW]
        hex_part = _hex_row(row)
        width = _column_of(BYTES_PER_ROW - 1) + 2
        lines.append(
            f"  {block.offset + row_start:04x}  {hex_part:<{width}}  |{_ascii_row(row)}|"
        )
        for start, length, label in runs:
            overlap_start = max(start, row_start)
            overlap_end = min(start + length, row_start + len(row))
            if overlap_start >= overlap_end:
                continue
            lead = _column_of(overlap_start - row_start)
            span = (
                _column_of(overlap_end - 1 - row_start)
                + 2
                - _column_of(overlap_start - row_start)
            )
            lines.append(
                f"  {' ' * 4}  {' ' * lead}{'^' * span}"
                f"{' ' * max(1, width - lead - span + 2)}{label}"
            )

    return "\\n".join(lines)


def arena_summary(arena: Arena) -> str:
    """One line per block - the REPL's \`.arena\` view."""
    if not arena.blocks:
        return "arena is empty - nothing garrisoned yet"
    lines = [
        f"arena: {len(arena.data)} bytes, "
        f"{len(arena.live_blocks())} of {len(arena.blocks)} blocks alive"
    ]
    for block in sorted(arena.blocks.values(), key=lambda b: b.offset):
        state = "alive   " if block.alive else "scorched"
        label = f" {block.label}" if block.label else ""
        lines.append(
            f"  0x{block.offset:04x}  {block.size:>6} bytes  {state}"
            f"  garrisoned at {_at(block.garrisoned_at)}{label}"
        )
    return "\\n".join(lines)


def leak_report(arena: Arena) -> str | None:
    """\`ancient weeds\` - what was never scorched. None if the ground is clean."""
    live = arena.live_blocks()
    if not live:
        return None
    total = sum(b.size for b in live)
    where = ", ".join(_at(b.garrisoned_at) for b in sorted(live, key=lambda b: b.garrisoned_at))
    plural = "pine" if len(live) == 1 else "pines"
    return (
        f"ancient weeds - {len(live)} {plural} never scorched "
        f"({total} bytes), garrisoned at {where}"
    )
`,"astheno/floorplan.py":`"""Floorplans - a layout diagram for a space, which is what a struct is for bytes.

Layout follows C: every field sits at its natural alignment, padding is inserted
to get there, and the whole plan is rounded up to its widest member's alignment
so an array of them stays aligned.

\`\`layout()\`\` prints the padding rows as well as the fields. Reordering a struct
to save memory is usually folklore passed between programmers; here it is a
thing you can look at.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from magmascript.lang.astheno.arena import AsthenoError, Pine
from magmascript.lang.astheno.numeric import SPECS, Fixed, NumSpec

# A stored pine is an 8-byte absolute offset into the arena. Offset 0 is the
# reserved null zone, so it reads back as \`none\`.
PINE_SIZE = 8
PINE_ALIGN = 8


@dataclass
class Field:
    name: str
    type_name: str
    offset: int
    size: int
    align: int
    kind: str                      # "scalar" | "array" | "nested" | "pine"
    spec: NumSpec | None = None
    plan: "Floorplan | None" = None
    count: int = 1

    # --- language-level access ------------------------------------------

    def get(self, pine: Pine) -> Any:
        if self.kind == "scalar":
            return pine.peek(self.spec, self.offset)
        if self.kind == "array":
            pine._check(self.offset, self.size)
            return pine.shifted(self.offset).typed(self.spec)
        if self.kind == "nested":
            pine._check(self.offset, self.size)
            return pine.shifted(self.offset).typed(self.plan)
        # pine field
        stored = pine.peek(SPECS["u64"], self.offset).value
        if stored == 0:
            return None
        block = pine.arena.block_containing(stored)
        if block is None:
            raise AsthenoError(
                f"field '{self.name}' holds 0x{stored:x}, which is not inside "
                f"any block this arena handed out"
            )
        return Pine(stored, pine.arena, block, self.plan)

    def set(self, pine: Pine, value: Any) -> Any:
        if self.kind == "scalar":
            return pine.poke(self.spec, value, self.offset)
        if self.kind == "pine":
            if value is None:
                return pine.poke(SPECS["u64"], 0, self.offset)
            if not isinstance(value, Pine):
                raise AsthenoError(
                    f"field '{self.name}' holds a pine, got {type(value).__name__}"
                )
            return pine.poke(SPECS["u64"], value.offset, self.offset)
        raise AsthenoError(
            f"field '{self.name}' is {self.type_name} - assign through it "
            f"(poke, or an index) rather than replacing it wholesale"
        )

    def read(self, pine: Pine) -> Any:
        """A short display value for bathysphere, or None to show nothing."""
        if self.kind == "scalar":
            return pine.peek(self.spec, self.offset).value
        if self.kind == "pine":
            stored = pine.peek(SPECS["u64"], self.offset).value
            return "none" if stored == 0 else f"0x{stored:04x}"
        return None


@dataclass
class Floorplan:
    name: str
    fields: list[Field] = field(default_factory=list)
    size: int = 0
    align: int = 1

    def field_named(self, name: str) -> Field | None:
        for f in self.fields:
            if f.name == name:
                return f
        return None

    @property
    def padding_bytes(self) -> int:
        return self.size - sum(f.size for f in self.fields)

    def __str__(self) -> str:
        return self.name

    def __repr__(self) -> str:
        return f"floorplan {self.name} ({self.size} bytes)"


def _align_up(value: int, alignment: int) -> int:
    return (value + alignment - 1) // alignment * alignment


def build_floorplan(
    name: str,
    declared: list[tuple[str, str, int, str]],
    known: dict[str, Floorplan],
) -> Floorplan:
    """Compute offsets, padding, size and alignment for a declared plan.

    \`declared\` is (field_name, type_name, count, points_to). count > 1 means an
    array; points_to names a pine field's target, which may be this very plan -
    that is how a linked list gets written.
    """
    plan = Floorplan(name=name)
    seen: set[str] = set()
    cursor = 0
    max_align = 1
    self_referencing: list[Field] = []

    for field_name, type_name, count, points_to in declared:
        if field_name in seen:
            raise AsthenoError(f"floorplan {name} declares '{field_name}' twice")
        seen.add(field_name)

        spec: NumSpec | None = None
        nested: Floorplan | None = None

        if type_name in SPECS:
            spec = SPECS[type_name]
            unit, align, kind = spec.bits // 8, spec.bits // 8, "scalar"
        elif type_name == "pine":
            unit, align, kind = PINE_SIZE, PINE_ALIGN, "pine"
            if points_to:
                if points_to == name:
                    nested = None          # patched in below
                elif points_to in known:
                    nested = known[points_to]
                else:
                    raise AsthenoError(
                        f"floorplan {name}: field '{field_name}' points at "
                        f"'{points_to}', which is not a floorplan"
                    )
        elif type_name in known:
            nested = known[type_name]
            unit, align, kind = nested.size, nested.align, "nested"
        elif type_name == name:
            # A plan cannot contain itself; it would be infinitely large.
            raise AsthenoError(
                f"floorplan {name} cannot contain itself - use a \`pine\` field "
                f"to point at another {name}"
            )
        else:
            raise AsthenoError(
                f"floorplan {name}: unknown type '{type_name}' for field "
                f"'{field_name}'"
            )

        if count > 1:
            kind = "array"
            display = f"{type_name}[{count}]"
            size = unit * count
        elif kind == "pine" and points_to:
            display = f"pine[{points_to}]"
            size = unit
        else:
            display = type_name
            size = unit

        cursor = _align_up(cursor, align)
        built = Field(
                name=field_name,
                type_name=display,
                offset=cursor,
                size=size,
                align=align,
                kind=kind,
                spec=spec,
                plan=nested if kind in ("nested", "pine") else None,
                count=count,
        )
        plan.fields.append(built)
        if kind == "pine" and points_to == name:
            self_referencing.append(built)
        cursor += size
        max_align = max(max_align, align)

    plan.align = max_align
    plan.size = _align_up(cursor, max_align) or max_align
    # A plan can point at itself. Its fields were built before the plan was
    # finished, so close the loop now.
    for built in self_referencing:
        built.plan = plan
    return plan


def describe_layout(what: Any) -> str:
    """The field table, padding included."""
    if not isinstance(what, Floorplan):
        name = getattr(what, "name", type(what).__name__)
        raise AsthenoError(f"layout() expected a floorplan, got {name}")

    lines = [
        f"floorplan {what.name} - {what.size} bytes, align {what.align}",
        f"  {'off':>4}  {'size':>4}  {'field':<16} {'type'}",
    ]
    cursor = 0
    for f in what.fields:
        if f.offset > cursor:
            gap = f.offset - cursor
            lines.append(
                f"  {cursor:>4}  {gap:>4}  {'-- padding --':<16}"
            )
        lines.append(f"  {f.offset:>4}  {f.size:>4}  {f.name:<16} {f.type_name}")
        cursor = f.offset + f.size
    if what.size > cursor:
        lines.append(
            f"  {cursor:>4}  {what.size - cursor:>4}  {'-- tail padding --':<16}"
        )

    wasted = what.padding_bytes
    if wasted:
        lines.append(
            f"  {wasted} of {what.size} bytes are padding - "
            f"ordering fields widest-first would pack them tighter"
        )
    return "\\n".join(lines)
`,"astheno/numeric.py":'"""Fixed-width numbers for the Asthenosphere.\n\nC\'s arithmetic, narrated. Values wrap exactly as C would, but every wrap and\nevery lossy conversion announces itself rather than happening in silence.\n\nDesign notes that differ from the dynamic tier on purpose:\n\n* No integer promotion. ``i32 + i32`` is ``i32``; ``i32 + u8`` is an error\n  directing you to ``osmosis()``. C\'s promotion rules are its worst-understood\n  corner and there is nothing to gain by reproducing them.\n* ``/`` on integer specs is C integer division, truncating toward zero, not the\n  float division the dynamic tier gives you. ``i32(-7) / i32(2)`` is ``-3``,\n  where Python\'s floor division would say ``-4``.\n* A bare int literal may combine with any integer spec, provided it fits.\n"""\n\nfrom __future__ import annotations\n\nimport struct\nfrom dataclasses import dataclass\nfrom typing import Any, Callable\n\n\n@dataclass(frozen=True)\nclass NumSpec:\n    name: str\n    bits: int\n    signed: bool\n    is_float: bool = False\n\n    @property\n    def low(self) -> int:\n        if self.is_float:\n            raise AttributeError("float specs have no integer bounds")\n        return -(1 << (self.bits - 1)) if self.signed else 0\n\n    @property\n    def high(self) -> int:\n        if self.is_float:\n            raise AttributeError("float specs have no integer bounds")\n        return (1 << (self.bits - 1)) - 1 if self.signed else (1 << self.bits) - 1\n\n    def __repr__(self) -> str:  # pragma: no cover - debugging aid\n        return self.name\n\n\nSPECS: dict[str, NumSpec] = {\n    "i8": NumSpec("i8", 8, True),\n    "i16": NumSpec("i16", 16, True),\n    "i32": NumSpec("i32", 32, True),\n    "i64": NumSpec("i64", 64, True),\n    "u8": NumSpec("u8", 8, False),\n    "u16": NumSpec("u16", 16, False),\n    "u32": NumSpec("u32", 32, False),\n    "u64": NumSpec("u64", 64, False),\n    "f32": NumSpec("f32", 32, True, is_float=True),\n    "f64": NumSpec("f64", 64, True, is_float=True),\n}\n\n\nclass AsthenoTypeError(TypeError):\n    """Mixing widths, or using a value the Asthenosphere cannot accept."""\n\n\n# The interpreter installs a hook so warnings carry a source location. Without\n# one (library use, tests) warnings go to stderr unadorned.\n_warn_hook: Callable[[str], None] | None = None\n\n\ndef set_warn_hook(fn: Callable[[str], None] | None) -> Callable[[str], None] | None:\n    global _warn_hook\n    previous = _warn_hook\n    _warn_hook = fn\n    return previous\n\n\ndef warn(message: str) -> None:\n    if _warn_hook is not None:\n        _warn_hook(message)\n        return\n    import sys\n    print(f"spooked: {message}", file=sys.stderr)\n\n\ndef _truncate_float(value: float, spec: NumSpec) -> float:\n    if spec.bits == 32:\n        return struct.unpack("<f", struct.pack("<f", value))[0]\n    return float(value)\n\n\ndef _wrap_int(value: int, spec: NumSpec) -> int:\n    mask = (1 << spec.bits) - 1\n    v = value & mask\n    if spec.signed and v > spec.high:\n        v -= 1 << spec.bits\n    return v\n\n\ndef coerce(value: Any, spec: NumSpec, *, context: str, quiet: bool = False) -> "Fixed":\n    """Build a Fixed of `spec`, wrapping or rounding and saying so."""\n    if isinstance(value, Fixed):\n        value = value.value\n    if isinstance(value, bool):\n        value = int(value)\n\n    if spec.is_float:\n        if not isinstance(value, (int, float)):\n            raise AsthenoTypeError(\n                f"{spec.name}() expected a number, got {type(value).__name__}"\n            )\n        result = _truncate_float(float(value), spec)\n        if not quiet and result != float(value):\n            warn(f"{context}: {value} loses precision as {spec.name} (became {result})")\n        return Fixed(result, spec)\n\n    if isinstance(value, float):\n        truncated = int(value)\n        if not quiet and truncated != value:\n            warn(f"{context}: {value} truncated to {truncated} for {spec.name}")\n        value = truncated\n    elif not isinstance(value, int):\n        raise AsthenoTypeError(\n            f"{spec.name}() expected a number, got {type(value).__name__}"\n        )\n\n    wrapped = _wrap_int(value, spec)\n    if not quiet and wrapped != value:\n        warn(\n            f"{context}: {value} does not fit {spec.name} "\n            f"[{spec.low}, {spec.high}] - wrapped to {wrapped}"\n        )\n    return Fixed(wrapped, spec)\n\n\n@dataclass(frozen=True)\nclass Fixed:\n    """A number of a declared width. `value` is already in range for `spec`."""\n\n    value: int | float\n    spec: NumSpec\n\n    def __str__(self) -> str:\n        return str(self.value)\n\n    def __repr__(self) -> str:\n        return f"{self.spec.name}({self.value})"\n\n    def __hash__(self) -> int:\n        return hash((self.value, self.spec.name))\n\n    def __bool__(self) -> bool:\n        return self.value != 0\n\n\ndef _unify(left: Any, right: Any, op: str) -> tuple[Any, Any, NumSpec]:\n    """Resolve operand specs, or explain why they cannot combine."""\n    lf, rf = isinstance(left, Fixed), isinstance(right, Fixed)\n\n    if lf and rf:\n        if left.spec is not right.spec:\n            raise AsthenoTypeError(\n                f"cannot use \'{op}\' on {left.spec.name} and {right.spec.name} - "\n                f"convert one first, e.g. osmosis(x, {left.spec.name})"\n            )\n        return left.value, right.value, left.spec\n\n    fixed = left if lf else right\n    bare = right if lf else left\n    if isinstance(bare, bool) or not isinstance(bare, (int, float)):\n        raise AsthenoTypeError(\n            f"cannot use \'{op}\' on {fixed.spec.name} and {type(bare).__name__}"\n        )\n    if isinstance(bare, float) and not fixed.spec.is_float:\n        raise AsthenoTypeError(\n            f"cannot use \'{op}\' on {fixed.spec.name} and a float - "\n            f"convert first, e.g. osmosis({bare}, {fixed.spec.name})"\n        )\n    if not fixed.spec.is_float and not (fixed.spec.low <= bare <= fixed.spec.high):\n        raise AsthenoTypeError(\n            f"{bare} does not fit {fixed.spec.name} "\n            f"[{fixed.spec.low}, {fixed.spec.high}]"\n        )\n    lv = left.value if lf else left\n    rv = right.value if rf else right\n    return lv, rv, fixed.spec\n\n\ndef _c_divide(a: int, b: int) -> int:\n    """Integer division truncating toward zero, as C does."""\n    q = abs(a) // abs(b)\n    return -q if (a < 0) != (b < 0) else q\n\n\ndef _c_remainder(a: int, b: int) -> int:\n    return a - _c_divide(a, b) * b\n\n\nARITHMETIC = {"+", "-", "*", "/", "%"}\nCOMPARISON = {"==", "!=", "<", ">", "<=", ">="}\n\n\ndef binary_op(op: str, left: Any, right: Any) -> Any:\n    """Apply `op` where at least one operand is a Fixed."""\n    if op in COMPARISON:\n        lv = left.value if isinstance(left, Fixed) else left\n        rv = right.value if isinstance(right, Fixed) else right\n        numeric = (int, float)\n        if (\n            isinstance(lv, bool)\n            or isinstance(rv, bool)\n            or not isinstance(lv, numeric)\n            or not isinstance(rv, numeric)\n        ):\n            return op == "!="\n        return {\n            "==": lv == rv,\n            "!=": lv != rv,\n            "<": lv < rv,\n            ">": lv > rv,\n            "<=": lv <= rv,\n            ">=": lv >= rv,\n        }[op]\n\n    if op not in ARITHMETIC:\n        raise AsthenoTypeError(f"\'{op}\' is not defined for fixed-width numbers")\n\n    lv, rv, spec = _unify(left, right, op)\n\n    if op in ("/", "%") and rv == 0:\n        raise ZeroDivisionError("Division by zero")\n\n    if spec.is_float:\n        if op == "+":\n            result = lv + rv\n        elif op == "-":\n            result = lv - rv\n        elif op == "*":\n            result = lv * rv\n        elif op == "/":\n            result = lv / rv\n        else:\n            result = lv - int(lv / rv) * rv\n        return Fixed(_truncate_float(float(result), spec), spec)\n\n    if op == "+":\n        exact = lv + rv\n    elif op == "-":\n        exact = lv - rv\n    elif op == "*":\n        exact = lv * rv\n    elif op == "/":\n        exact = _c_divide(lv, rv)\n    else:\n        exact = _c_remainder(lv, rv)\n\n    wrapped = _wrap_int(exact, spec)\n    if wrapped != exact:\n        warn(\n            f"{spec.name} overflow: {lv} {op} {rv} = {exact}, "\n            f"wrapped to {wrapped} (range [{spec.low}, {spec.high}])"\n        )\n    return Fixed(wrapped, spec)\n\n\ndef negate(value: Fixed) -> Fixed:\n    if value.spec.is_float:\n        return Fixed(-value.value, value.spec)\n    exact = -value.value\n    wrapped = _wrap_int(exact, value.spec)\n    if wrapped != exact:\n        warn(f"{value.spec.name} overflow: -{value.value} wrapped to {wrapped}")\n    return Fixed(wrapped, value.spec)\n',"builtins.py":`from __future__ import annotations

from typing import Any, Callable


class HttpProxy:
    """HTTP client for making requests from .mgs scripts."""

    def get(self, url: str, **kwargs: Any) -> dict:
        """Make a GET request and return status, text, json, headers."""
        import httpx
        try:
            response = httpx.get(url, timeout=30, **kwargs)
            result: dict[str, Any] = {
                "status": response.status_code,
                "text": response.text,
                "headers": dict(response.headers),
            }
            try:
                result["json"] = response.json()
            except Exception:
                result["json"] = None
            return result
        except httpx.TimeoutException:
            raise TimeoutError(f"http.get: request timed out after 30 seconds: {url}")
        except httpx.RequestError as e:
            raise ConnectionError(f"http.get: request failed: {e}")

    def post(self, url: str, body: Any = None, **kwargs: Any) -> dict:
        """Make a POST request and return status, text, json, headers."""
        import httpx
        try:
            response = httpx.post(url, json=body, timeout=30, **kwargs)
            result = {
                "status": response.status_code,
                "text": response.text,
                "headers": dict(response.headers),
            }
            try:
                result["json"] = response.json()
            except Exception:
                result["json"] = None
            return result
        except httpx.TimeoutException:
            raise TimeoutError(f"http.post: request timed out after 30 seconds: {url}")
        except httpx.RequestError as e:
            raise ConnectionError(f"http.post: request failed: {e}")


def to_display(value: Any, *, nested: bool = False) -> str:
    """Render a value the way MagmaScript spells it.

    Python's str() leaks its own vocabulary - None, True, False - into a
    language whose literals are none, true and false. Everything that shows a
    value to the user goes through here so the spelling is the same in print,
    echo, f-strings and str().

    Strings print bare at the top level but quoted inside a container, so
    ["a", "b"] stays readable as a list of two strings.
    """
    from magmascript.lang.domain_bridge import ListWrapper

    if value is None:
        return "none"
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, str):
        return f'"{value}"' if nested else value
    if isinstance(value, (list, ListWrapper)):
        return "[" + ", ".join(to_display(v, nested=True) for v in value) + "]"
    if isinstance(value, dict):
        inner = ", ".join(
            f"{to_display(k, nested=True)}: {to_display(v, nested=True)}"
            for k, v in value.items()
        )
        return "{" + inner + "}"
    return str(value)


def builtin_print(*args: Any) -> None:
    print(*[to_display(a) for a in args])


def builtin_echo(*args: Any) -> None:
    print(*[to_display(a) for a in args])


def builtin_len(value: Any) -> int:
    from magmascript.lang.domain_bridge import ListWrapper, DataclassWrapper
    if isinstance(value, (str, list, dict, ListWrapper)):
        return len(value)
    if isinstance(value, DataclassWrapper):
        obj = object.__getattribute__(value, "_obj")
        if hasattr(obj, "__len__"):
            return len(obj)
    raise TypeError(f"len() expected string, list, or dict, got {type(value).__name__}")


def builtin_type(value: Any) -> str:
    from magmascript.lang.interpreter import MgsClass, MgsInstance
    from magmascript.lang.astheno import Fixed, SpecHandle
    if value is None:
        return "none"
    if isinstance(value, Fixed):
        return value.spec.name
    if isinstance(value, SpecHandle):
        return "width"
    if isinstance(value, bool):
        return "bool"
    if isinstance(value, int):
        return "int"
    if isinstance(value, float):
        return "float"
    if isinstance(value, str):
        return "string"
    if isinstance(value, list):
        return "list"
    if isinstance(value, dict):
        return "dict"
    if isinstance(value, MgsInstance):
        return value.class_def.name
    if isinstance(value, MgsClass):
        return "class"
    if callable(value):
        return "function"
    return "object"


def builtin_str(value: Any) -> str:
    return to_display(value)


def builtin_int(value: Any) -> int:
    from magmascript.lang.astheno import Fixed
    if isinstance(value, Fixed):
        return int(value.value)
    if isinstance(value, str):
        return int(value)
    if isinstance(value, (int, float)):
        return int(value)
    raise TypeError(f"int() expected string or number, got {type(value).__name__}")


def builtin_float(value: Any) -> float:
    from magmascript.lang.astheno import Fixed
    if isinstance(value, Fixed):
        return float(value.value)
    if isinstance(value, str):
        return float(value)
    if isinstance(value, (int, float)):
        return float(value)
    raise TypeError(f"float() expected string or number, got {type(value).__name__}")


def builtin_range(*args: Any) -> list[int]:
    if len(args) == 1:
        return list(range(int(args[0])))
    if len(args) == 2:
        return list(range(int(args[0]), int(args[1])))
    if len(args) == 3:
        return list(range(int(args[0]), int(args[1]), int(args[2])))
    raise TypeError(f"range() takes 1-3 arguments, got {len(args)}")


def builtin_keys(value: Any) -> list[str]:
    if isinstance(value, dict):
        return list(value.keys())
    raise TypeError(f"keys() expected dict, got {type(value).__name__}")


def builtin_values(value: Any) -> list[Any]:
    if isinstance(value, dict):
        return list(value.values())
    raise TypeError(f"values() expected dict, got {type(value).__name__}")


def builtin_abs(value: Any) -> Any:
    from magmascript.lang.astheno import Fixed, coerce
    if isinstance(value, Fixed):
        return coerce(abs(value.value), value.spec, context="abs()")
    if isinstance(value, (int, float)):
        return abs(value)
    raise TypeError(f"abs() expected number, got {type(value).__name__}")


def builtin_min(*args: Any) -> Any:
    if len(args) == 1 and isinstance(args[0], list):
        return min(args[0])
    return min(args)


def builtin_max(*args: Any) -> Any:
    if len(args) == 1 and isinstance(args[0], list):
        return max(args[0])
    return max(args)


def builtin_sum(*args: Any) -> Any:
    if len(args) == 1 and isinstance(args[0], list):
        return sum(args[0])
    return sum(args)


def builtin_quarry(path: str) -> str:
    """Read file contents (quarry stone from the ground)."""
    from pathlib import Path
    try:
        return Path(path).read_text(encoding="utf-8")
    except FileNotFoundError:
        raise FileNotFoundError(f"quarry: file not found: {path}")
    except IsADirectoryError:
        raise IsADirectoryError(f"quarry: is a directory: {path}")


def builtin_litho(path: str, content: str) -> None:
    """Write content to file (lithography - writing on stone)."""
    from pathlib import Path
    try:
        Path(path).write_text(content, encoding="utf-8")
    except IsADirectoryError:
        raise IsADirectoryError(f"litho: is a directory: {path}")


def builtin_exec(command: str) -> dict:
    """Execute a shell command and return stdout, stderr, and exit code."""
    import subprocess
    try:
        result = subprocess.run(
            ["bash", "-c", command],
            capture_output=True,
            text=True,
            timeout=30,
        )
        return {
            "stdout": result.stdout,
            "stderr": result.stderr,
            "exit_code": result.returncode,
        }
    except subprocess.TimeoutExpired:
        raise TimeoutError(f"exec: command timed out after 30 seconds: {command}")


BUILTINS: dict[str, Callable] = {
    "print": builtin_print,
    "echo": builtin_echo,
    "len": builtin_len,
    "type": builtin_type,
    "str": builtin_str,
    "int": builtin_int,
    "float": builtin_float,
    "range": builtin_range,
    "keys": builtin_keys,
    "values": builtin_values,
    "abs": builtin_abs,
    "min": builtin_min,
    "max": builtin_max,
    "sum": builtin_sum,
    "quarry": builtin_quarry,
    "litho": builtin_litho,
    "exec": builtin_exec,
}

# The Asthenosphere's widths and conversions. Registered as builtins rather
# than keywords so a script that already uses these names keeps working.
from magmascript.lang.astheno import ASTHENO_BUILTINS  # noqa: E402

BUILTINS.update(ASTHENO_BUILTINS)
`,"domain_bridge.py":`from __future__ import annotations

from dataclasses import fields, is_dataclass
from typing import Any

from magmascript.core.registry import get_domain, list_domains, register_domain

# Packages outside this repo publish domains under this entry-point group.
ENTRY_POINT_GROUP = "magmascript.domains"


class DomainProxy:
    """A domain, exposed to scripts under its name.

    The client is built on first use, not at interpreter startup. Every domain
    used to be constructed for every script and every REPL session, which cost
    startup time for domains nobody touched and ruled out any domain whose
    construction does something — opening a window, holding a socket.
    """

    def __init__(self, name: str, client: Any = None, *,
                 factory: Any = None) -> None:
        object.__setattr__(self, "_name", name)
        object.__setattr__(self, "_factory", factory)
        object.__setattr__(self, "_client_cache", client)

    @property
    def _client(self) -> Any:
        client = object.__getattribute__(self, "_client_cache")
        if client is None:
            factory = object.__getattribute__(self, "_factory")
            if factory is None:
                name = object.__getattribute__(self, "_name")
                raise AttributeError(f"domain '{name}' has no client")
            client = factory()
            object.__setattr__(self, "_client_cache", client)
        return client

    def __getattr__(self, name: str) -> Any:
        if name.startswith("_"):
            raise AttributeError(name)

        method = getattr(self._client, name, None)
        if method is None:
            raise AttributeError(f"'{self._name}' has no method '{name}'")

        def wrapper(*args: Any, **kwargs: Any) -> Any:
            result = method(*args, **kwargs)
            return wrap_result(result)

        return wrapper

    def close(self) -> None:
        # Only a client that was actually built can need closing, and touching
        # self._client here would construct one just to tear it down.
        client = object.__getattribute__(self, "_client_cache")
        if client is not None and hasattr(client, "close"):
            try:
                client.close()
            except Exception:
                pass

    def __del__(self) -> None:
        self.close()

    def __repr__(self) -> str:
        return f"<domain:{self._name}>"


class DataclassWrapper:
    def __init__(self, obj: Any) -> None:
        object.__setattr__(self, "_obj", obj)

    def __getattr__(self, name: str) -> Any:
        obj = object.__getattribute__(self, "_obj")
        if name.startswith("_"):
            raise AttributeError(name)
        if is_dataclass(obj) and not isinstance(obj, type):
            for f in fields(obj):
                if f.name == name:
                    return wrap_result(getattr(obj, name))
        # Not a field, but dataclasses carry properties and methods too, and a
        # script has no way to tell which is which. InputState.dx and
        # ControllerState.up are properties over the fields; without this a
        # script could read the raw buttons byte but not the buttons.
        try:
            return wrap_result(getattr(obj, name))
        except AttributeError:
            raise AttributeError(
                f"'{type(obj).__name__}' has no attribute '{name}'"
            ) from None

    def __repr__(self) -> str:
        obj = object.__getattribute__(self, "_obj")
        return repr(obj)

    def __str__(self) -> str:
        obj = object.__getattribute__(self, "_obj")
        return str(obj)


class ListWrapper:
    def __init__(self, items: list[Any]) -> None:
        self._items = [wrap_result(item) for item in items]

    def __getitem__(self, index: int) -> Any:
        return self._items[index]

    def __len__(self) -> int:
        return len(self._items)

    def __iter__(self) -> Any:
        return iter(self._items)

    def __repr__(self) -> str:
        return repr(self._items)

    def __str__(self) -> str:
        return str(self._items)


def wrap_result(result: Any) -> Any:
    from magmascript.lang.interpreter import MgsInstance, MgsClass
    from magmascript.lang.astheno import Fixed, Pine
    if result is None:
        return None
    if isinstance(result, (int, float, str, bool)):
        return result
    # Asthenosphere values are dataclasses but are language primitives, not
    # host objects to be introspected. They must not be wrapped.
    if isinstance(result, (Fixed, Pine)):
        return result
    if callable(result):
        return result
    if isinstance(result, (MgsInstance, MgsClass)):
        return result
    if isinstance(result, list):
        return ListWrapper(result)
    if is_dataclass(result) and not isinstance(result, type):
        return DataclassWrapper(result)
    return result


def _domain_factory(name: str) -> Any:
    """Build the thunk that constructs one domain's client on first use.

    A constructor that raises now surfaces at the call that needed it, rather
    than the domain silently not existing and the script reporting an undefined
    variable several lines later.
    """

    def build() -> Any:
        from magmascript.core.config import get_config

        return get_domain(name)(get_config())

    return build


def discover_domains() -> None:
    """Register domains published by other installed packages.

    A package declares one in its own metadata::

        [project.entry-points."magmascript.domains"]
        texastoast = "texastoast.mgs:TexastoastDomain"

    which is what lets a domain live in the project it belongs to rather than
    in this repo. Built-ins win on a name clash, and a broken entry point is
    skipped rather than taking the interpreter down with it.
    """
    from importlib.metadata import entry_points

    try:
        found = entry_points(group=ENTRY_POINT_GROUP)
    except Exception:
        # Broken installed metadata is not this interpreter's problem to solve,
        # and must not stop a script that uses only built-in domains.
        return

    builtins = set(list_domains())
    for entry in found:
        if entry.name in builtins:
            continue
        try:
            register_domain(entry.name, entry.load())
        except Exception:
            # A third-party package that fails to import must not stop a script
            # that never mentions it from running.
            continue


def create_domain_proxies() -> dict[str, DomainProxy]:
    discover_domains()
    return {
        name: DomainProxy(name, factory=_domain_factory(name))
        for name in list_domains()
    }
`,"environment.py":`from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from magmascript.lang.util import suggest


class EnvironmentError(Exception):
    def __init__(self, message: str, suggestion: str | None = None) -> None:
        self.suggestion = suggestion
        super().__init__(message)


@dataclass
class Environment:
    parent: Environment | None = None
    variables: dict[str, Any] = field(default_factory=dict)

    def get(self, name: str) -> Any:
        if name in self.variables:
            return self.variables[name]
        if self.parent is not None:
            return self.parent.get(name)
        candidates = self._collect_names()
        hint = suggest(name, candidates) if candidates else None
        raise EnvironmentError(f"Undefined variable '{name}'", hint)

    def set(self, name: str, value: Any) -> None:
        if name in self.variables:
            self.variables[name] = value
            return
        if self.parent is not None and self.parent.has(name):
            self.parent.set(name, value)
            return
        self.variables[name] = value

    def define(self, name: str, value: Any) -> None:
        self.variables[name] = value

    def has(self, name: str) -> bool:
        if name in self.variables:
            return True
        if self.parent is not None:
            return self.parent.has(name)
        return False

    def child(self) -> Environment:
        return Environment(parent=self)

    def _collect_names(self) -> list[str]:
        names = list(self.variables.keys())
        if self.parent is not None:
            names.extend(self.parent._collect_names())
        return names
`,"hypnagogia.py":'"""hypnagogia - the pass that runs at the threshold, just before execution.\n\nThe state between waking and sleep. Nothing has run yet; the program is walked\nonce and asked what it is about to do wrong.\n\nMagmaScript is dynamic, so this pass is deliberately timid. It reports only\nwhat cannot be explained away by control flow:\n\n* A name that is never bound *anywhere* in an enclosing scope. Order is\n  ignored on purpose - ``if c { x = 1 }`` followed by ``print(x)`` is legal\n  when ``c`` holds, and flagging it would be a false alarm. A name bound\n  nowhere at all, though, is a typo.\n* Statements sitting after a ``return``, ``break``, or ``continue`` in the same\n  block, which can never run.\n\nFindings are warnings, not errors: a program that has always worked keeps\nworking. Floorplan and width faults stay where they are, raised for real when\nthe declaration is executed.\n\nCustom rules can be registered via ``register_rule()``.\n"""\n\nfrom __future__ import annotations\n\nfrom dataclasses import dataclass, field\n\nfrom magmascript.lang import ast_nodes as ast\nfrom magmascript.lang.util import suggest\nfrom magmascript.lang.visitor import Visitor, children\n\n\n@dataclass\nclass Finding:\n    line: int\n    column: int\n    message: str\n\n    def render(self, filename: str | None = None) -> str:\n        where = f"{filename}:{self.line}" if filename else f"line {self.line}"\n        return f"hypnagogia at {where}: {self.message}"\n\n\nTERMINATORS = (ast.ReturnStatement, ast.BreakStatement, ast.ContinueStatement)\n\n\n# -- custom rule registry ------------------------------------------------\n\n_rules: list[tuple[str, callable]] = []\n\n\ndef register_rule(name: str, checker: callable) -> None:\n    """Register a custom hypnagogia rule.\n\n    The checker receives (program, findings) and appends to findings.\n    """\n    _rules.append((name, checker))\n\n\ndef list_rules() -> list[str]:\n    """Return names of all registered rules."""\n    return [name for name, _ in _rules]\n\n\n# -- the main pass -------------------------------------------------------\n\nclass Hypnagogia(Visitor):\n    def __init__(self, global_names: set[str] | None = None) -> None:\n        super().__init__()\n        self.findings: list[Finding] = []\n        self.globals: set[str] = set(global_names or ())\n        self._scopes: list[set[str]] = []\n\n    # -- entry ----------------------------------------------------------\n\n    def inspect(self, program: ast.Program) -> list[Finding]:\n        bound = set(self.globals) | self._bindings(program.body)\n        self._scopes = [bound]\n        self._check_unreachable(program.body)\n        for stmt in program.body:\n            self.visit(stmt)\n\n        # Run custom rules\n        for name, checker in _rules:\n            checker(program, self.findings)\n\n        self.findings.sort(key=lambda f: (f.line, f.column))\n        return self.findings\n\n    # -- binding collection ---------------------------------------------\n\n    def _bindings(self, nodes: list[ast.ASTNode]) -> set[str]:\n        """Every name bound anywhere beneath `nodes`, at this function level.\n\n        Nested function bodies are not descended into: their inner names are\n        not visible out here.\n        """\n        found: set[str] = set()\n        for node in nodes:\n            self._collect(node, found)\n        return found\n\n    def _collect(self, node: ast.ASTNode, found: set[str]) -> None:\n        if node is None:\n            return\n\n        if isinstance(node, ast.Assignment):\n            found.add(node.name)\n        elif isinstance(node, ast.MultiAssignment):\n            found.update(node.targets)\n        elif isinstance(node, ast.FunctionDef):\n            found.add(node.name)\n            return  # body belongs to its own scope\n        elif isinstance(node, ast.ArrowFunction):\n            return\n        elif isinstance(node, ast.ClassDef):\n            found.add(node.name)\n            return\n        elif isinstance(node, ast.FloorplanDef):\n            found.add(node.name)\n            return\n        elif isinstance(node, ast.ForLoop):\n            found.add(node.variable)\n        elif isinstance(node, ast.ListComprehension):\n            found.add(node.variable)\n        elif isinstance(node, ast.TryCatch):\n            if node.catch_param:\n                found.add(node.catch_param)\n        elif isinstance(node, ast.ImportStatement):\n            if node.alias:\n                found.add(node.alias)\n            for name in node.names:\n                found.add(name)\n            if not node.alias and not node.names:\n                found.add(node.module.replace("/", ".").split(".")[-1])\n\n        for child in children(node):\n            self._collect(child, found)\n\n    # -- visitor methods ------------------------------------------------\n\n    def visit_Identifier(self, node: ast.Identifier) -> None:\n        if not any(node.name in scope for scope in self._scopes):\n            known = set().union(*self._scopes) if self._scopes else set()\n            hint = suggest(node.name, sorted(known)) if known else None\n            message = f"\'{node.name}\' is never given a value"\n            if hint:\n                message += f" - did you mean \'{hint}\'?"\n            self.findings.append(Finding(node.line, node.column, message))\n\n    def visit_FunctionDef(self, node: ast.FunctionDef) -> None:\n        inner = set(node.params)\n        body = node.body\n        inner |= self._bindings(getattr(body, "body", [body]))\n        for default in node.defaults.values():\n            self.visit(default)\n        self._scopes.append(inner)\n        self.visit(body)\n        self._scopes.pop()\n\n    def visit_ArrowFunction(self, node: ast.ArrowFunction) -> None:\n        inner = set(node.params)\n        body = node.body\n        inner |= self._bindings(getattr(body, "body", [body]))\n        for default in node.defaults.values():\n            self.visit(default)\n        self._scopes.append(inner)\n        self.visit(body)\n        self._scopes.pop()\n\n    def visit_ClassDef(self, node: ast.ClassDef) -> None:\n        for method in node.methods:\n            inner = set(method.params) | {"self"}\n            body = method.body\n            inner |= self._bindings(getattr(body, "body", [body]))\n            self._scopes.append(inner)\n            self.visit(body)\n            self._scopes.pop()\n\n    def visit_FloorplanDef(self, node: ast.FloorplanDef) -> None:\n        pass  # field types are checked when the declaration runs\n\n    def visit_PropertyAccess(self, node: ast.PropertyAccess) -> None:\n        self.visit(node.object)\n        # the property name is not a variable\n\n    def visit_PropertyAssignment(self, node: ast.PropertyAssignment) -> None:\n        self.visit(node.object)\n        self.visit(node.value)\n\n    def visit_MethodCall(self, node: ast.MethodCall) -> None:\n        self.visit(node.object)\n        for arg in node.arguments:\n            self.visit(arg)\n\n    def visit_Block(self, node: ast.Block) -> None:\n        self._check_unreachable(node.body)\n        for child in children(node):\n            self.visit(child)\n\n    # -- unreachable code -----------------------------------------------\n\n    def _check_unreachable(self, body: list[ast.ASTNode]) -> None:\n        for index, stmt in enumerate(body):\n            if isinstance(stmt, TERMINATORS) and index + 1 < len(body):\n                nxt = body[index + 1]\n                word = type(stmt).__name__.replace("Statement", "").lower()\n                self.findings.append(\n                    Finding(\n                        getattr(nxt, "line", 0),\n                        getattr(nxt, "column", 0),\n                        f"this can never run - the {word} above always leaves first",\n                    )\n                )\n                return\n\n\ndef inspect(program: ast.Program, global_names: set[str] | None = None) -> list[Finding]:\n    return Hypnagogia(global_names).inspect(program)\n',"interpreter.py":`from __future__ import annotations

import sys
from dataclasses import dataclass, field
from typing import Any, Callable

from magmascript.lang import ast_nodes as ast
from magmascript.lang.environment import Environment, EnvironmentError
from magmascript.lang.builtins import BUILTINS, to_display
from magmascript.lang.domain_bridge import create_domain_proxies, wrap_result
from magmascript.lang.util import suggest
from magmascript.lang import astheno


# Maximum nested .mgs function calls. Each one costs ~7 Python frames, so the
# interpreter raises Python's own limit to leave room for this many plus the
# expression nesting inside them.
MAX_CALL_DEPTH = 500
_PY_FRAMES_PER_CALL = 7
_PY_RECURSION_HEADROOM = 2000


class RuntimeError(Exception):
    def __init__(self, message: str, line: int = 0, column: int = 0, filename: str | None = None, source_line: str | None = None, call_stack: list[str] | None = None, prefix: str = "fire toad") -> None:
        self.line = line
        self.column = column
        self.filename = filename
        self.source_line = source_line
        self.call_stack = call_stack or []
        self.message = message
        self.prefix = prefix
        super().__init__(message)

    def format(self) -> str:
        parts = []
        if self.line:
            loc = f"line {self.line}, column {self.column}"
            if self.filename:
                loc = f"{self.filename}:{loc}"
            parts.append(f"{self.prefix} at {loc}")

            if self.source_line is not None:
                line_num = str(self.line)
                padding = " " * len(line_num)
                parts.append(f"  {padding} |")
                parts.append(f"  {line_num} | {self.source_line}")
                caret = " " * (self.column - 1) + "^"
                parts.append(f"  {padding} | {caret}")
        else:
            parts.append(self.prefix)

        parts.append(self.message)

        if self.call_stack:
            parts.append("")
            parts.append("Stack trace:")
            for frame in self.call_stack:
                parts.append(f"  {frame}")

        return "\\n".join(parts)


class BreakSignal(Exception):
    pass


class ContinueSignal(Exception):
    pass


class ReturnSignal(Exception):
    def __init__(self, value: Any = None) -> None:
        self.value = value


@dataclass
class MgsFunction:
    params: list[str]
    body: ast.ASTNode
    closure: Environment
    name: str = ""
    defaults: dict[str, Any] = field(default_factory=dict)

    def __call__(self, *args: Any) -> Any:
        min_args = len(self.params) - len(self.defaults)
        if len(args) < min_args or len(args) > len(self.params):
            name = self.name or "anonymous"
            if min_args == len(self.params):
                # No defaults - simple error message
                raise RuntimeError(f"{name}() takes {len(self.params)} argument{'s' if len(self.params) != 1 else ''} but {len(args)} {'were' if len(args) != 1 else 'was'} given")
            else:
                # Has defaults - range error message
                raise RuntimeError(f"{name}() takes {min_args}-{len(self.params)} argument(s) but {len(args)} {'were' if len(args) != 1 else 'was'} given")

        child_env = self.closure.child()
        for param, arg in zip(self.params, args):
            child_env.define(param, arg)
        # Bind defaults for unprovided params
        for param in self.params[len(args):]:
            if param in self.defaults:
                child_env.define(param, self.defaults[param])

        interp = _get_thread_interpreter()
        if len(interp._call_stack) >= MAX_CALL_DEPTH:
            raise interp._depth_error(self.body)
        interp._call_stack.append(self._stack_frame())
        try:
            result = interp.execute(self.body, child_env)
            return result
        except ReturnSignal as e:
            return e.value
        finally:
            interp._call_stack.pop()

    def _stack_frame(self) -> str:
        name = self.name or "anonymous"
        body = self.body
        if hasattr(body, "line") and body.line:
            return f"{name}() at line {body.line}"
        return f"{name}()"

    def __repr__(self) -> str:
        if self.name:
            return f"<function:{self.name}>"
        return "<function:anonymous>"


@dataclass
class MgsClass:
    name: str
    methods: dict[str, MgsFunction]
    closure: Environment

    def __call__(self, *args: Any) -> Any:
        instance = MgsInstance(
            class_def=self,
            attributes={},
        )
        init = self.methods.get("init")
        if init:
            # Only prepend self if not already in params
            if init.params and init.params[0] == "self":
                init_with_self = init
            else:
                init_with_self = MgsFunction(
                    params=["self"] + init.params,
                    body=init.body,
                    closure=self.closure,
                    name="init",
                )
            init_with_self(instance, *args)
        return instance

    def __repr__(self) -> str:
        return f"<class:{self.name}>"


@dataclass
class MgsInstance:
    class_def: MgsClass
    attributes: dict[str, Any]

    def __repr__(self) -> str:
        return f"<{self.class_def.name} instance>"

    def __str__(self) -> str:
        str_method = self.class_def.methods.get("__str__")
        if str_method:
            return str_method(self)
        return self.__repr__()


class MgsString:
    def __init__(self, value: str) -> None:
        self._value = value

    def split(self, sep: str | None = None) -> list[str]:
        if sep is None:
            return self._value.split()
        return self._value.split(sep)

    def join(self, iterable: list[str]) -> str:
        return self._value.join(iterable)

    def upper(self) -> str:
        return self._value.upper()

    def lower(self) -> str:
        return self._value.lower()

    def contains(self, sub: str) -> bool:
        return sub in self._value

    def replace(self, old: str, new: str) -> str:
        return self._value.replace(old, new)

    def length(self) -> int:
        return len(self._value)

    def startswith(self, prefix: str) -> bool:
        return self._value.startswith(prefix)

    def endswith(self, suffix: str) -> bool:
        return self._value.endswith(suffix)

    def strip(self) -> str:
        return self._value.strip()

    def match(self, pattern: str) -> list[str] | None:
        """Check if pattern matches at the start of the string. Returns groups or None."""
        import re
        m = re.match(pattern, self._value)
        if m:
            return list(m.groups()) if m.groups() else [m.group(0)]
        return None

    def findall(self, pattern: str) -> list[str]:
        """Find all non-overlapping matches of pattern in the string."""
        import re
        return re.findall(pattern, self._value)

    def __repr__(self) -> str:
        return self._value

    def __str__(self) -> str:
        return self._value


_thread_interpreter: Interpreter | None = None


def _get_thread_interpreter() -> Interpreter:
    global _thread_interpreter
    if _thread_interpreter is None:
        _thread_interpreter = Interpreter()
    return _thread_interpreter


class Interpreter:
    def __init__(self, source: str | None = None, filename: str | None = None, script_args: list[str] | None = None) -> None:
        self.globals = Environment()
        self.source = source
        self.filename = filename
        self._call_stack: list[str] = []
        self._current_node: ast.ASTNode | None = None
        self.arena = astheno.Arena()
        self._script_args = script_args or []
        self._module_cache: dict[str, Environment] = {}
        self._loading_modules: set[str] = set()
        needed = MAX_CALL_DEPTH * _PY_FRAMES_PER_CALL + _PY_RECURSION_HEADROOM
        if sys.getrecursionlimit() < needed:
            sys.setrecursionlimit(needed)
        self._setup_builtins()
        self._setup_domains()

    def _setup_builtins(self) -> None:
        for name, func in BUILTINS.items():
            self.globals.define(name, func)
        self.globals.define("args", lambda: self._script_args)

    def _setup_domains(self) -> None:
        proxies = create_domain_proxies()
        for name, proxy in proxies.items():
            self.globals.define(name, proxy)
        # Add HTTP proxy for .mgs scripts
        from magmascript.lang.builtins import HttpProxy
        self.globals.define("http", HttpProxy())

    def _get_source_line(self, line_num: int) -> str | None:
        if self.source is None:
            return None
        lines = self.source.split("\\n")
        if 1 <= line_num <= len(lines):
            return lines[line_num - 1]
        return None

    def error(self, message: str, node: ast.ASTNode | None = None, prefix: str = "fire toad") -> RuntimeError:
        line = getattr(node, "line", 0) or 0
        column = getattr(node, "column", 0) or 0
        source_line = self._get_source_line(line) if line else None
        return RuntimeError(message, line, column, self.filename, source_line, list(self._call_stack), prefix)

    def _depth_error(self, node: ast.ASTNode | None = None) -> RuntimeError:
        """Build the recursion-limit error with an elided stack.

        format() prints every frame it is given, so handing it a 500-deep
        stack would bury the message. Show the bottom and top of the stack
        and count what is between.
        """
        frames = self._call_stack
        if len(frames) > 8:
            frames = frames[:3] + [f"... {len(frames) - 6} more frames ..."] + frames[-3:]
        else:
            frames = list(frames)
        line = getattr(node, "line", 0) or 0
        column = getattr(node, "column", 0) or 0
        # parse_block() builds Block without position info, so fall back to the
        # first statement inside the function body.
        if not line:
            inner = next(iter(getattr(node, "body", []) or []), None)
            line = getattr(inner, "line", 0) or 0
            column = getattr(inner, "column", 0) or 0
        source_line = self._get_source_line(line) if line else None
        return RuntimeError(
            f"Call depth exceeded {MAX_CALL_DEPTH} — is this recursion infinite?",
            line,
            column,
            self.filename,
            source_line,
            frames,
            "exploding brain syndrome",
        )

    def run(self, program: ast.Program) -> Any:
        # Register as the active interpreter so MgsFunction.__call__ executes
        # bodies against *this* instance. Without this, any entry point that
        # constructs an Interpreter directly (the CLI does) leaves the global
        # unset, and function bodies run on a blank interpreter with no source
        # — costing every in-function error its filename and caret diagram.
        # Save/restore rather than assign, so an imported module's interpreter
        # does not outlive its own run().
        global _thread_interpreter
        previous = _thread_interpreter
        _thread_interpreter = self
        previous_hook = astheno.set_warn_hook(self._astheno_warn)
        previous_site = astheno.set_site_hook(self._astheno_site)
        previous_arena = astheno.set_arena(self.arena)
        try:
            result = None
            for stmt in program.body:
                result = self.execute(stmt, self.globals)
            return result
        finally:
            _thread_interpreter = previous
            astheno.set_warn_hook(previous_hook)
            astheno.set_site_hook(previous_site)
            astheno.set_arena(previous_arena)

    def execute(self, node: ast.ASTNode, env: Environment) -> Any:
        method = getattr(self, f"exec_{type(node).__name__}", None)
        if method is None:
            raise RuntimeError(f"Unknown node type: {type(node).__name__}")
        # Asthenosphere warnings (overflow, precision loss, leaks) are raised
        # deep inside pure helpers that have no AST access. Recording the node
        # here is what lets those warnings name a line. Measured cost: none.
        self._current_node = node
        try:
            return method(node, env)
        except astheno.AsthenoError as e:
            # Raised deep inside arena helpers with no AST access. The
            # innermost execute() frame catches it, so the reported node is
            # the precise one; outer frames see a RuntimeError and pass it on.
            raise self.error(str(e), node, prefix=e.prefix) from None

    def _astheno_site(self) -> int:
        return getattr(self._current_node, "line", 0) or 0

    def report_leaks(self) -> None:
        """Announce anything never scorched. Call at program exit."""
        report = astheno.leak_report(self.arena)
        if report:
            print(f"spooked: {report}", file=sys.stderr)

    def _astheno_warn(self, message: str) -> None:
        node = self._current_node
        line = getattr(node, "line", 0) or 0
        prefix = "spooked"
        if line:
            prefix += f" at {self.filename}:{line}" if self.filename else f" at line {line}"
        print(f"{prefix}: {message}", file=sys.stderr)

    def exec_Program(self, node: ast.Program, env: Environment) -> Any:
        result = None
        for stmt in node.body:
            result = self.execute(stmt, env)
        return result

    def exec_Block(self, node: ast.Block, env: Environment) -> Any:
        child_env = env.child()
        result = None
        for stmt in node.body:
            result = self.execute(stmt, child_env)
        return result

    def exec_NumberLiteral(self, node: ast.NumberLiteral, env: Environment) -> Any:
        return node.value

    def exec_StringLiteral(self, node: ast.StringLiteral, env: Environment) -> Any:
        return node.value

    def exec_BoolLiteral(self, node: ast.BoolLiteral, env: Environment) -> Any:
        return node.value

    def exec_NoneLiteral(self, node: ast.NoneLiteral, env: Environment) -> Any:
        return None

    def exec_Identifier(self, node: ast.Identifier, env: Environment) -> Any:
        try:
            return env.get(node.name)
        except EnvironmentError as e:
            msg = f"Undefined variable '{node.name}'"
            if e.suggestion:
                msg += f" — did you mean '{e.suggestion}'?"
            raise self.error(msg, node, prefix="devastate")

    def exec_BinaryOp(self, node: ast.BinaryOp, env: Environment) -> Any:
        left = self.execute(node.left, env)

        if node.op == "and":
            if not left:
                return left
            return self.execute(node.right, env)

        if node.op == "or":
            if left:
                return left
            return self.execute(node.right, env)

        right = self.execute(node.right, env)

        if isinstance(left, astheno.Pine) or isinstance(right, astheno.Pine):
            return self._pine_binary_op(node, left, right)

        if isinstance(left, astheno.Fixed) or isinstance(right, astheno.Fixed):
            try:
                return astheno.binary_op(node.op, left, right)
            except astheno.AsthenoTypeError as e:
                raise self.error(str(e), node, prefix="contemplate")
            except ZeroDivisionError:
                raise self.error("Division by zero", node)

        if node.op == "+":
            if isinstance(left, str) and isinstance(right, str):
                return left + right
            if isinstance(left, list) and isinstance(right, list):
                return left + right
            return left + right
        if node.op == "-":
            return left - right
        if node.op == "*":
            if isinstance(left, str) and isinstance(right, int):
                return left * right
            if isinstance(left, list) and isinstance(right, int):
                return left * right
            return left * right
        if node.op == "/":
            if right == 0:
                raise self.error("Division by zero", node)
            return left / right
        if node.op == "%":
            return left % right
        if node.op == "==":
            return left == right
        if node.op == "!=":
            return left != right
        if node.op == "<":
            return left < right
        if node.op == ">":
            return left > right
        if node.op == "<=":
            return left <= right
        if node.op == ">=":
            return left >= right
        if node.op == "in":
            if isinstance(right, dict):
                return left in right
            if isinstance(right, (list, str)):
                return left in right
            raise self.error(f"Cannot use 'in' on {type(right).__name__}", node)
        if node.op == "not in":
            if isinstance(right, dict):
                return left not in right
            if isinstance(right, (list, str)):
                return left not in right
            raise self.error(f"Cannot use 'not in' on {type(right).__name__}", node)

        raise RuntimeError(f"Unknown operator: {node.op}", node.line, node.column)

    def _pine_binary_op(self, node: ast.BinaryOp, left: Any, right: Any) -> Any:
        op = node.op
        if op in ("==", "!="):
            same = (
                isinstance(left, astheno.Pine)
                and isinstance(right, astheno.Pine)
                and left.offset == right.offset
            )
            return same if op == "==" else not same

        if op in ("+", "-"):
            # pine - pine is the distance between them, in bytes.
            if isinstance(left, astheno.Pine) and isinstance(right, astheno.Pine):
                if op == "+":
                    raise self.error(
                        "two pines cannot be added - subtract them for the "
                        "distance between them",
                        node,
                        prefix="contemplate",
                    )
                return left.offset - right.offset

            if op == "-" and not isinstance(left, astheno.Pine):
                raise self.error(
                    "cannot subtract a pine from a number", node, prefix="contemplate"
                )

            pine, delta = (left, right) if isinstance(left, astheno.Pine) else (right, left)
            if isinstance(delta, astheno.Fixed):
                delta = delta.value
            if isinstance(delta, bool) or not isinstance(delta, int):
                raise self.error(
                    f"a pine can only shift by a whole number of bytes, "
                    f"got {type(delta).__name__}",
                    node,
                    prefix="contemplate",
                )
            return pine.shifted(delta if op == "+" else -delta)

        raise self.error(
            f"'{op}' is not defined for pines", node, prefix="contemplate"
        )

    def exec_UnaryOp(self, node: ast.UnaryOp, env: Environment) -> Any:
        operand = self.execute(node.operand, env)

        if node.op == "-":
            if isinstance(operand, astheno.Fixed):
                return astheno.negate(operand)
            return -operand
        if node.op == "not":
            return not operand

        raise RuntimeError(f"Unknown unary operator: {node.op}", node.line, node.column)

    def exec_Assignment(self, node: ast.Assignment, env: Environment) -> Any:
        value = self.execute(node.value, env)
        env.set(node.name, value)
        return value

    def exec_MultiAssignment(self, node: ast.MultiAssignment, env: Environment) -> Any:
        # Evaluate all RHS values
        values = [self.execute(v, env) for v in node.values]

        # If single RHS value that is iterable (list), unpack it
        if len(values) == 1 and len(node.targets) > 1:
            iterable = values[0]
            if isinstance(iterable, (list,)):
                if len(iterable) != len(node.targets):
                    raise self.error(
                        f"Cannot unpack {len(iterable)} values into {len(node.targets)} targets",
                        node,
                    )
                values = list(iterable)

        # Validate count match
        if len(node.targets) != len(values):
            raise self.error(
                f"Multi-assignment mismatch: {len(node.targets)} targets, {len(values)} values",
                node,
            )

        # Assign each value
        for name, value in zip(node.targets, values):
            env.set(name, value)

        return values[0] if len(values) == 1 else values

    def exec_PropertyAccess(self, node: ast.PropertyAccess, env: Environment) -> Any:
        obj = self.execute(node.object, env)
        if obj is None:
            raise self.error("Cannot access property on None", node)

        if isinstance(obj, astheno.Pine):
            field = self._pine_field(obj, node.property)
            if field is not None:
                return field.get(obj)

        # Handle instance attribute/method access
        if isinstance(obj, MgsInstance):
            # First check instance attributes
            if node.property in obj.attributes:
                return obj.attributes[node.property]
            # Then check class methods
            if node.property in obj.class_def.methods:
                method = obj.class_def.methods[node.property]
                def bound_method(*args: Any) -> Any:
                    return method(obj, *args)
                return bound_method
            raise self.error(
                f"'{obj.class_def.name}' has no attribute '{node.property}'",
                node,
            )

        if isinstance(obj, dict):
            if node.property in obj:
                return obj[node.property]
            available = ", ".join(sorted(obj.keys()))
            raise self.error(f"Property '{node.property}' not found on dict. Available: {available}", node)

        if hasattr(obj, "_obj"):
            return getattr(obj, node.property)

        if hasattr(obj, node.property):
            return getattr(obj, node.property)

        raise self.error(f"Cannot access property '{node.property}' on {type(obj).__name__}", node)

    def exec_IndexAccess(self, node: ast.IndexAccess, env: Environment) -> Any:
        obj = self.execute(node.object, env)

        # Handle slice syntax: list[start:stop:step]
        if isinstance(node.index, ast.Slice):
            start = self.execute(node.index.start, env) if node.index.start else None
            stop = self.execute(node.index.stop, env) if node.index.stop else None
            step = self.execute(node.index.step, env) if node.index.step else None
            if isinstance(obj, (list, str)):
                return obj[start:stop:step]
            raise self.error(f"Cannot slice {type(obj).__name__}", node)

        index = self.execute(node.index, env)

        if isinstance(obj, astheno.Pine):
            return astheno.Fixed(obj.read_byte(self._pine_index(index, node)), astheno.SPECS["u8"])

        if isinstance(obj, list):
            if not isinstance(index, int):
                raise self.error("List index must be an integer", node)
            if index < 0 or index >= len(obj):
                raise self.error(f"List index {index} out of range (list has {len(obj)} element{'s' if len(obj) != 1 else ''})", node)
            return obj[index]

        if isinstance(obj, dict):
            if index not in obj:
                available = ", ".join(repr(k) for k in sorted(obj.keys(), key=str))
                raise self.error(f"Key {index!r} not found in dict. Available keys: {available}", node)
            return obj[index]

        if hasattr(obj, "__getitem__"):
            try:
                return obj[index]
            except (KeyError, IndexError) as e:
                raise self.error(str(e), node)

        raise self.error(f"Cannot index into {type(obj).__name__}", node)

    def exec_FunctionCall(self, node: ast.FunctionCall, env: Environment) -> Any:
        callee = self.execute(node.callee, env)
        args = [self.execute(arg, env) for arg in node.arguments]

        if callable(callee):
            try:
                result = callee(*args)
                return wrap_result(result)
            except RuntimeError:
                raise
            except TypeError as e:
                raise self.error(str(e), node, prefix="contemplate")

        raise self.error(f"Cannot call non-function: {type(callee).__name__}", node)

    def exec_MethodCall(self, node: ast.MethodCall, env: Environment) -> Any:
        obj = self.execute(node.object, env)
        args = [self.execute(arg, env) for arg in node.arguments]

        if obj is None:
            raise self.error("Cannot call method on None", node)

        # Handle instance method calls
        if isinstance(obj, MgsInstance):
            method = obj.class_def.methods.get(node.method)
            if method is None:
                raise self.error(
                    f"'{obj.class_def.name}' has no method '{node.method}'",
                    node,
                )
            try:
                result = method(obj, *args)
                return wrap_result(result)
            except RuntimeError:
                raise
            except TypeError as e:
                raise self.error(str(e), node, prefix="contemplate")

        if isinstance(obj, str):
            mgs_str = MgsString(obj)
            method = getattr(mgs_str, node.method, None)
            if method and callable(method):
                try:
                    result = method(*args)
                    return result
                except RuntimeError:
                    raise
                except TypeError as e:
                    raise self.error(str(e), node, prefix="contemplate")

        # Support calling functions stored in dicts: module.func()
        if isinstance(obj, dict) and node.method in obj:
            func = obj[node.method]
            if callable(func):
                try:
                    return func(*args)
                except RuntimeError:
                    raise
                except TypeError as e:
                    raise self.error(str(e), node, prefix="contemplate")
            return func

        if hasattr(obj, "_obj"):
            method = getattr(obj, node.method, None)
            if method:
                try:
                    result = method(*args)
                    return wrap_result(result)
                except RuntimeError:
                    raise
                except TypeError as e:
                    raise self.error(str(e), node, prefix="contemplate")

        if hasattr(obj, node.method):
            method = getattr(obj, node.method)
            if callable(method):
                try:
                    result = method(*args)
                    return wrap_result(result)
                except RuntimeError:
                    raise
                except TypeError as e:
                    raise self.error(str(e), node, prefix="contemplate")

        type_name = type(obj).__name__
        if hasattr(obj, "_obj"):
            type_name = type(obj._obj).__name__
        raise self.error(f"{type_name} has no method '{node.method}'", node)

    def exec_IfExpression(self, node: ast.IfExpression, env: Environment) -> Any:
        condition = self.execute(node.condition, env)

        if self._is_truthy(condition):
            return self.execute(node.then_block, env)
        elif node.else_block:
            return self.execute(node.else_block, env)

        return None

    def exec_ForLoop(self, node: ast.ForLoop, env: Environment) -> Any:
        iterable = self.execute(node.iterable, env)

        if isinstance(iterable, list):
            items = iterable
        elif hasattr(iterable, "__iter__"):
            items = list(iterable)
        else:
            raise self.error(f"Cannot iterate over {type(iterable).__name__}", node)

        result = None
        child_env = env.child()
        for item in items:
            child_env.define(node.variable, item)
            try:
                result = self.execute(node.body, child_env)
            except BreakSignal:
                break
            except ContinueSignal:
                continue

        return result

    def exec_WhileLoop(self, node: ast.WhileLoop, env: Environment) -> Any:
        result = None
        while self._is_truthy(self.execute(node.condition, env)):
            try:
                result = self.execute(node.body, env)
            except BreakSignal:
                break
            except ContinueSignal:
                continue
        return result

    def exec_FunctionDef(self, node: ast.FunctionDef, env: Environment) -> Any:
        # Evaluate defaults at definition time
        evaluated_defaults = {
            name: self.execute(expr, env) for name, expr in node.defaults.items()
        }
        func = MgsFunction(
            params=node.params,
            body=node.body,
            closure=env,
            name=node.name,
            defaults=evaluated_defaults,
        )
        if node.name:
            env.define(node.name, func)
        return func

    def exec_ArrowFunction(self, node: ast.ArrowFunction, env: Environment) -> Any:
        evaluated_defaults = {
            name: self.execute(expr, env) for name, expr in node.defaults.items()
        }
        return MgsFunction(
            params=node.params,
            body=node.body,
            closure=env,
            defaults=evaluated_defaults,
        )

    def exec_ReturnStatement(self, node: ast.ReturnStatement, env: Environment) -> Any:
        value = None
        if node.value:
            value = self.execute(node.value, env)
        raise ReturnSignal(value)

    def exec_BreakStatement(self, node: ast.BreakStatement, env: Environment) -> Any:
        raise BreakSignal()

    def exec_ContinueStatement(self, node: ast.ContinueStatement, env: Environment) -> Any:
        raise ContinueSignal()

    def exec_ListLiteral(self, node: ast.ListLiteral, env: Environment) -> Any:
        return [self.execute(elem, env) for elem in node.elements]

    def exec_DictLiteral(self, node: ast.DictLiteral, env: Environment) -> Any:
        result = {}
        for key_node, value_node in zip(node.keys, node.values):
            key = self.execute(key_node, env)
            value = self.execute(value_node, env)
            result[key] = value
        return result

    def exec_ListComprehension(self, node: ast.ListComprehension, env: Environment) -> Any:
        iterable = self.execute(node.iterable, env)
        result = []
        child_env = env.child()
        for item in iterable:
            child_env.define(node.variable, item)
            if node.condition is not None:
                if not self._is_truthy(self.execute(node.condition, child_env)):
                    continue
            result.append(self.execute(node.element, child_env))
        return result

    def exec_InterpolatedString(self, node: ast.InterpolatedString, env: Environment) -> Any:
        parts = []
        for part in node.parts:
            value = self.execute(part, env)
            parts.append(to_display(value))
        return "".join(parts)

    def exec_ExprStatement(self, node: ast.ExprStatement, env: Environment) -> Any:
        return self.execute(node.expr, env)

    def exec_PrintStatement(self, node: ast.PrintStatement, env: Environment) -> Any:
        args = [self.execute(arg, env) for arg in node.arguments]
        print(*[to_display(a) for a in args])
        return None

    def exec_SpookedStatement(self, node: ast.SpookedStatement, env: Environment) -> Any:
        import sys
        message = to_display(self.execute(node.message, env))
        prefix = "spooked"
        if node.line:
            loc = f" at line {node.line}"
            if self.filename:
                loc = f" at {self.filename}:{node.line}"
            prefix += loc
        print(f"{prefix}: {message}", file=sys.stderr)
        return None

    def _resolve_module_path(self, module: str) -> str:
        """Resolve module path relative to current file or search path."""
        from pathlib import Path
        
        # If it's an absolute path, use it directly
        if Path(module).is_absolute():
            if not Path(module).suffix:
                return module + ".mgs"
            return module
        
        # If it's a relative path (starts with ./ or ../), resolve relative to current file
        if module.startswith("./") or module.startswith("../"):
            if self.filename:
                current_dir = Path(self.filename).parent
                resolved = (current_dir / module).resolve()
            else:
                resolved = Path(module).resolve()
            if not resolved.suffix:
                resolved = resolved.with_suffix(".mgs")
            return str(resolved)
        
        # For non-relative paths, search in current file's directory
        candidates = []
        if self.filename:
            current_dir = Path(self.filename).parent
            candidates.append(current_dir / module)
            candidates.append(current_dir / "lib" / module)
        
        # Add ~/.magmascript/lib/
        home = Path.home()
        candidates.append(home / ".magmascript" / "lib" / module)
        
        # Try with .mgs extension
        for candidate in candidates:
            if candidate.with_suffix(".mgs").exists():
                return str(candidate.with_suffix(".mgs"))
            if candidate.exists():
                return str(candidate)
        
        # If not found, return the first candidate with .mgs extension
        if candidates:
            return str(candidates[0].with_suffix(".mgs"))
        else:
            return module + ".mgs"

    def _load_module(self, module_path: str, node: ast.ImportStatement) -> Environment:
        """Load and execute a module, returning its environment."""
        from pathlib import Path
        
        # Check cache
        if module_path in self._module_cache:
            return self._module_cache[module_path]
        
        # Check for circular imports
        if module_path in self._loading_modules:
            raise RuntimeError(
                f"Circular import detected: {module_path}",
                node.line,
                node.column,
                self.filename,
                prefix="fire toad",
            )
        
        # Check file exists
        if not Path(module_path).exists():
            raise RuntimeError(
                f"Module not found: {module_path}",
                node.line,
                node.column,
                self.filename,
                prefix="fire toad",
            )
        
        # Read and parse the module
        self._loading_modules.add(module_path)
        try:
            with open(module_path, "r", encoding="utf-8") as f:
                source = f.read()
            
            from magmascript.lang.lexer import Lexer
            from magmascript.lang.parser import Parser
            
            tokens = Lexer(source, filename=module_path).tokenize()
            program = Parser(tokens, source=source, filename=module_path).parse()
            
            # Create a new interpreter for the module
            interpreter = Interpreter(source=source, filename=module_path, script_args=self._script_args)
            interpreter._module_cache = self._module_cache
            interpreter._loading_modules = self._loading_modules
            interpreter.run(program)
            
            # Cache the module
            self._module_cache[module_path] = interpreter.globals
            
            return interpreter.globals
        finally:
            self._loading_modules.discard(module_path)

    def exec_ImportStatement(self, node: ast.ImportStatement, env: Environment) -> Any:
        module_path = self._resolve_module_path(node.module)
        module_env = self._load_module(module_path, node)
        
        # Determine the namespace name - use the original module name, not the resolved path
        namespace = node.alias or node.module
        if namespace.endswith(".mgs"):
            namespace = namespace[:-4]
        # If the namespace is a full path, extract just the filename
        if "/" in namespace or "\\\\" in namespace:
            from pathlib import Path
            namespace = Path(namespace).stem
        
        if node.from_import:
            # Import specific names: intent { name1, name2 } from "module"
            if node.alias:
                # intent { name1, name2 } from "module" as alias
                # Create a namespace object with the specified names
                namespace_obj = {}
                for name in node.names:
                    if name in module_env.variables:
                        namespace_obj[name] = module_env.variables[name]
                    else:
                        raise RuntimeError(
                            f"Name '{name}' not found in module '{node.module}'",
                            node.line,
                            node.column,
                            self.filename,
                            prefix="fire toad",
                        )
                env.define(namespace, namespace_obj)
            else:
                # intent { name1, name2 } from "module"
                # Import names directly into current scope
                for name in node.names:
                    if name in module_env.variables:
                        env.define(name, module_env.variables[name])
                    else:
                        raise RuntimeError(
                            f"Name '{name}' not found in module '{node.module}'",
                            node.line,
                            node.column,
                            self.filename,
                            prefix="fire toad",
                        )
        else:
            # Import entire module: intent "module" or intent "module" as alias
            # Convert module environment to a dict for property access
            module_dict = dict(module_env.variables)
            env.define(namespace, module_dict)
        
        return None

    def exec_TryCatch(self, node: ast.TryCatch, env: Environment) -> Any:
        try:
            return self.execute(node.try_block, env)
        except RuntimeError as e:
            # Bind the error to the catch parameter
            catch_env = env.child()
            catch_env.define(node.catch_param, {
                "message": e.message,
                "line": e.line,
                "file": e.filename,
                "prefix": e.prefix,
                "format": lambda: e.format(),
            })
            return self.execute(node.catch_block, catch_env)

    def exec_ThrowStatement(self, node: ast.ThrowStatement, env: Environment) -> Any:
        message = self.execute(node.message, env)
        raise RuntimeError(
            str(message),
            node.line,
            node.column,
            self.filename,
            prefix=node.error_type,
        )

    def exec_FloorplanDef(self, node: ast.FloorplanDef, env: Environment) -> Any:
        from magmascript.lang.astheno.floorplan import Floorplan, build_floorplan

        known: dict[str, Floorplan] = {}
        scope: Environment | None = env
        while scope is not None:
            for key, value in scope.variables.items():
                if isinstance(value, Floorplan) and key not in known:
                    known[key] = value
            scope = scope.parent

        declared = [(f.name, f.type_name, f.count, f.points_to) for f in node.fields]
        plan = build_floorplan(node.name, declared, known)
        env.define(node.name, plan)
        return plan

    def exec_ClassDef(self, node: ast.ClassDef, env: Environment) -> Any:
        methods = {}
        for method_node in node.methods:
            # Evaluate defaults at class definition time
            evaluated_defaults = {
                name: self.execute(expr, env) for name, expr in method_node.defaults.items()
            }
            func = MgsFunction(
                params=method_node.params,
                body=method_node.body,
                closure=env,
                name=method_node.name,
                defaults=evaluated_defaults,
            )
            methods[method_node.name] = func

        mgs_class = MgsClass(
            name=node.name,
            methods=methods,
            closure=env,
        )
        env.define(node.name, mgs_class)
        return mgs_class

    def _pine_field(self, pine: Any, name: str) -> Any:
        """The floorplan field \`name\` on this pine, or None if it has no plan."""
        plan = pine.spec
        if getattr(plan, "fields", None) is None:
            return None
        field = plan.field_named(name)
        if field is None:
            available = ", ".join(f.name for f in plan.fields)
            raise astheno.AsthenoError(
                f"floorplan {plan.name} has no field '{name}'. Available: {available}"
            )
        return field

    def exec_PropertyAssignment(self, node: ast.PropertyAssignment, env: Environment) -> Any:
        obj = self.execute(node.object, env)
        value = self.execute(node.value, env)

        if isinstance(obj, astheno.Pine):
            field = self._pine_field(obj, node.property)
            if field is not None:
                return field.set(obj, value)

        if isinstance(obj, MgsInstance):
            obj.attributes[node.property] = value
            return value

        if isinstance(obj, dict):
            obj[node.property] = value
            return value

        # A host object from a domain — a game entity, a config, anything the
        # bridge handed back. Reading its attributes already works
        # (exec_PropertyAccess falls through to getattr), so writing them has
        # to as well, or a script can inspect an object and never change it.
        if not node.property.startswith("_") and hasattr(obj, node.property):
            if isinstance(value, astheno.Fixed):
                # Widths are an Asthenosphere concept. Handing one to a host
                # object poisons its arithmetic downstream, so store the number.
                value = value.value
            try:
                setattr(obj, node.property, value)
            except AttributeError as e:
                raise self.error(
                    f"Cannot set '{node.property}' on {type(obj).__name__}: {e}",
                    node,
                ) from None
            return value

        raise self.error(
            f"Cannot set property on {type(obj).__name__}",
            node,
        )

    def _pine_index(self, index: Any, node: ast.ASTNode) -> int:
        if isinstance(index, astheno.Fixed):
            index = index.value
        if isinstance(index, bool) or not isinstance(index, int):
            raise self.error(
                f"a pine is indexed by whole bytes, got {type(index).__name__}",
                node,
                prefix="contemplate",
            )
        return index

    def exec_IndexAssignment(self, node: ast.IndexAssignment, env: Environment) -> Any:
        obj = self.execute(node.object, env)
        index = self.execute(node.index, env)
        value = self.execute(node.value, env)

        if isinstance(obj, astheno.Pine):
            at = self._pine_index(index, node)
            if node.op != "=":
                current = obj.read_byte(at)
                raw = value.value if isinstance(value, astheno.Fixed) else value
                value = current + raw if node.op == "+=" else current - raw
            return astheno.Fixed(obj.write_byte(at, value), astheno.SPECS["u8"])

        if isinstance(obj, str):
            raise self.error("Cannot assign into a string — strings are immutable", node)

        if isinstance(obj, list):
            if not isinstance(index, int) or isinstance(index, bool):
                raise self.error("List index must be an integer", node)
            if index < 0 or index >= len(obj):
                raise self.error(
                    f"List index {index} out of range (list has {len(obj)} element{'s' if len(obj) != 1 else ''})",
                    node,
                )
        elif isinstance(obj, dict):
            pass
        else:
            raise self.error(f"Cannot assign into {type(obj).__name__}", node)

        if node.op != "=":
            if isinstance(obj, dict) and index not in obj:
                raise self.error(f"Key '{index}' not found", node, prefix="devastate")
            current = obj[index]
            try:
                value = current + value if node.op == "+=" else current - value
            except TypeError as e:
                raise self.error(str(e), node, prefix="contemplate")

        obj[index] = value
        return value

    def _is_truthy(self, value: Any) -> bool:
        if value is None:
            return False
        if isinstance(value, astheno.Fixed):
            return value.value != 0
        if isinstance(value, astheno.Pine):
            return value.alive
        if isinstance(value, bool):
            return value
        if isinstance(value, int):
            return value != 0
        if isinstance(value, float):
            return value != 0.0
        if isinstance(value, str):
            return len(value) > 0
        if isinstance(value, list):
            return len(value) > 0
        if isinstance(value, dict):
            return len(value) > 0
        return True


def run(source: str, script_args: list[str] | None = None) -> Any:
    from magmascript.lang.parser import parse
    program = parse(source)
    interpreter = Interpreter(source=source, script_args=script_args)
    global _thread_interpreter
    _thread_interpreter = interpreter
    try:
        return interpreter.run(program)
    finally:
        interpreter.report_leaks()
`,"lexer.py":`from __future__ import annotations

from magmascript.lang.tokens import Token, TokenType, KEYWORDS


class LexerError(Exception):
    def __init__(self, message: str, line: int, column: int, source_line: str | None = None, filename: str | None = None) -> None:
        self.line = line
        self.column = column
        self.source_line = source_line
        self.filename = filename
        self.message = message
        super().__init__(message)

    def format(self) -> str:
        parts = []
        loc = f"line {self.line}, column {self.column}"
        if self.filename:
            loc = f"{self.filename}:{loc}"
        parts.append(f"haunter at {loc}")

        if self.source_line is not None:
            line_num = str(self.line)
            padding = " " * len(line_num)
            parts.append(f"  {padding} |")
            parts.append(f"  {line_num} | {self.source_line}")
            caret = " " * (self.column - 1) + "^" * min(len(self.source_line) - self.column + 1, 20)
            parts.append(f"  {padding} | {caret}")

        parts.append(self.message)
        return "\\n".join(parts)


class Lexer:
    def __init__(self, source: str, filename: str | None = None) -> None:
        self.source = source
        self.filename = filename
        self.pos = 0
        self.line = 1
        self.column = 1
        self.tokens: list[Token] = []
        self.indent_stack: list[int] = [0]
        self.paren_depth = 0

    def error(self, message: str) -> LexerError:
        source_line = self._get_source_line(self.line)
        return LexerError(message, self.line, self.column, source_line, self.filename)

    def _get_source_line(self, line_num: int) -> str | None:
        lines = self.source.split("\\n")
        if 1 <= line_num <= len(lines):
            return lines[line_num - 1]
        return None

    def peek(self) -> str | None:
        if self.pos < len(self.source):
            return self.source[self.pos]
        return None

    def advance(self) -> str:
        ch = self.source[self.pos]
        self.pos += 1
        if ch == "\\n":
            self.line += 1
            self.column = 1
        else:
            self.column += 1
        return ch

    def match(self, expected: str) -> bool:
        if self.pos < len(self.source) and self.source[self.pos] == expected:
            self.advance()
            return True
        return False

    def peek_next(self) -> str | None:
        if self.pos + 1 < len(self.source):
            return self.source[self.pos + 1]
        return None

    def skip_whitespace(self) -> None:
        while self.pos < len(self.source) and self.source[self.pos] in " \\t\\r":
            self.advance()

    def skip_comment(self) -> bool:
        if self.pos + 1 < len(self.source) and self.source[self.pos:self.pos + 2] == "//":
            while self.pos < len(self.source) and self.source[self.pos] != "\\n":
                self.advance()
            return True
        return False

    def read_string(self, allow_interpolation: bool = False) -> Token:
        """Read a string literal.

        Only f-strings interpolate. In a plain string \`{\` is an ordinary
        character, so it is neither scanned for a matching \`}\` nor tagged
        for the parser.
        """
        line, col = self.line, self.column
        quote = self.advance()
        parts: list[str] = []
        has_interpolation = False

        while self.pos < len(self.source) and self.source[self.pos] != quote:
            if self.source[self.pos] == "\\\\":
                self.advance()
                if self.pos < len(self.source):
                    esc = self.advance()
                    if esc == "n":
                        parts.append("\\n")
                    elif esc == "t":
                        parts.append("\\t")
                    elif esc == "\\\\":
                        parts.append("\\\\")
                    elif esc == quote:
                        parts.append(quote)
                    elif esc == "{":
                        parts.append("{")
                    else:
                        parts.append("\\\\" + esc)
            elif self.source[self.pos] == "{" and allow_interpolation:
                has_interpolation = True
                parts.append(self.advance())
                depth = 1
                while self.pos < len(self.source) and depth > 0:
                    ch = self.source[self.pos]
                    if ch == "{":
                        depth += 1
                    elif ch == "}":
                        depth -= 1
                    if depth > 0:
                        parts.append(self.advance())
                    else:
                        parts.append(self.advance())
            else:
                parts.append(self.advance())

        if self.pos >= len(self.source):
            preview = "".join(parts)[:30]
            raise self.error(f"Unterminated string starting with {quote}{preview}...")

        self.advance()
        value = "".join(parts)

        if has_interpolation:
            return Token(TokenType.STRING, ("interpolated", value), line, col)
        return Token(TokenType.STRING, ("plain", value), line, col)

    def read_number(self) -> Token:
        line, col = self.line, self.column
        start = self.pos
        has_dot = False

        while self.pos < len(self.source) and self.source[self.pos].isdigit():
            self.advance()

        if self.pos < len(self.source) and self.source[self.pos] == ".":
            if self.peek_next() and self.peek_next().isdigit():
                has_dot = True
                self.advance()
                while self.pos < len(self.source) and self.source[self.pos].isdigit():
                    self.advance()

        value_str = self.source[start:self.pos]
        value = float(value_str) if has_dot else int(value_str)
        return Token(TokenType.NUMBER, value, line, col)

    def read_identifier(self) -> Token:
        line, col = self.line, self.column
        start = self.pos

        while self.pos < len(self.source) and (self.source[self.pos].isalnum() or self.source[self.pos] == "_"):
            self.advance()

        word = self.source[start:self.pos]
        token_type = KEYWORDS.get(word, TokenType.IDENTIFIER)

        # Special two-word operator: "not in"
        if word == "not":
            saved_pos, saved_line, saved_col = self.pos, self.line, self.column
            # skip whitespace
            while self.pos < len(self.source) and self.source[self.pos] in " \\t":
                self.advance()
            if self.pos < len(self.source) and self.source[self.pos:self.pos + 2] == "in":
                after_in = self.pos + 2
                if after_in >= len(self.source) or not (self.source[after_in].isalnum() or self.source[after_in] == "_"):
                    self.advance()  # consume 'i'
                    self.advance()  # consume 'n'
                    return Token(TokenType.NOT_IN, "not in", line, col)
            # restore position
            self.pos, self.line, self.column = saved_pos, saved_line, saved_col

        return Token(token_type, word, line, col)

    def handle_newline(self) -> None:
        line, col = self.line, self.column
        self.advance()

        if self.pos >= len(self.source) or self.source[self.pos] == "#" or self.source[self.pos:self.pos + 2] == "//":
            return

        if self.paren_depth > 0:
            return

        current_indent = 0
        while self.pos < len(self.source) and self.source[self.pos] in " \\t":
            current_indent += 1
            self.advance()

        if current_indent > self.indent_stack[-1]:
            self.indent_stack.append(current_indent)
            self.tokens.append(Token(TokenType.INDENT, current_indent, line, col))
        elif current_indent < self.indent_stack[-1]:
            while self.indent_stack[-1] > current_indent:
                self.indent_stack.pop()
                self.tokens.append(Token(TokenType.DEDENT, 0, self.line, self.column))
            if self.indent_stack[-1] != current_indent:
                raise self.error(f"Indentation error: expected {self.indent_stack[-1]} spaces, got {current_indent}")

    def tokenize(self) -> list[Token]:
        while self.pos < len(self.source):
            self.skip_whitespace()

            if self.pos >= len(self.source):
                break

            ch = self.source[self.pos]

            line, col = self.line, self.column

            if ch == "\\n":
                if self.paren_depth == 0:
                    self.tokens.append(Token(TokenType.NEWLINE, "\\\\n", line, col))
                    self.handle_newline()
                else:
                    self.advance()
                continue

            if ch == "#":
                while self.pos < len(self.source) and self.source[self.pos] != "\\n":
                    self.advance()
                continue

            if self.skip_comment():
                continue

            if ch == '"' or ch == "'":
                self.tokens.append(self.read_string())
            elif ch.isdigit():
                self.tokens.append(self.read_number())
            elif ch.isalpha() or ch == "_":
                token = self.read_identifier()
                if token.value == "f" and self.peek() in ('"', "'"):
                    string_token = self.read_string(allow_interpolation=True)
                    kind, value = string_token.value
                    self.tokens.append(Token(TokenType.STRING, ("interpolated", value), token.line, token.column))
                else:
                    self.tokens.append(token)
            elif ch == "(":
                self.paren_depth += 1
                self.tokens.append(Token(TokenType.LPAREN, "(", line, col))
                self.advance()
            elif ch == ")":
                self.paren_depth = max(0, self.paren_depth - 1)
                self.tokens.append(Token(TokenType.RPAREN, ")", line, col))
                self.advance()
            elif ch == "{":
                self.paren_depth += 1
                self.tokens.append(Token(TokenType.LBRACE, "{", line, col))
                self.advance()
            elif ch == "}":
                self.paren_depth = max(0, self.paren_depth - 1)
                self.tokens.append(Token(TokenType.RBRACE, "}", line, col))
                self.advance()
            elif ch == "[":
                self.paren_depth += 1
                self.tokens.append(Token(TokenType.LBRACKET, "[", line, col))
                self.advance()
            elif ch == "]":
                self.paren_depth = max(0, self.paren_depth - 1)
                self.tokens.append(Token(TokenType.RBRACKET, "]", line, col))
                self.advance()
            elif ch == "+":
                self.advance()
                if self.match("="):
                    self.tokens.append(Token(TokenType.PLUS_EQ, "+=", line, col))
                else:
                    self.tokens.append(Token(TokenType.PLUS, "+", line, col))
            elif ch == "-":
                self.advance()
                if self.match(">"):
                    self.tokens.append(Token(TokenType.ARROW, "->", line, col))
                elif self.match("="):
                    self.tokens.append(Token(TokenType.MINUS_EQ, "-=", line, col))
                else:
                    self.tokens.append(Token(TokenType.MINUS, "-", line, col))
            elif ch == "*":
                self.tokens.append(Token(TokenType.STAR, "*", line, col))
                self.advance()
            elif ch == "/":
                self.advance()
                if self.match("/"):
                    while self.pos < len(self.source) and self.source[self.pos] != "\\n":
                        self.advance()
                else:
                    self.tokens.append(Token(TokenType.SLASH, "/", line, col))
            elif ch == "%":
                self.tokens.append(Token(TokenType.PERCENT, "%", line, col))
                self.advance()
            elif ch == "=":
                self.advance()
                if self.match("="):
                    self.tokens.append(Token(TokenType.EQEQ, "==", line, col))
                else:
                    self.tokens.append(Token(TokenType.EQ, "=", line, col))
            elif ch == "!":
                self.advance()
                if self.match("="):
                    self.tokens.append(Token(TokenType.NEQ, "!=", line, col))
                else:
                    raise self.error(f"Unexpected character '!' — did you mean '!='?")
            elif ch == "<":
                self.advance()
                if self.match("="):
                    self.tokens.append(Token(TokenType.LTE, "<=", line, col))
                else:
                    self.tokens.append(Token(TokenType.LT, "<", line, col))
            elif ch == ">":
                self.advance()
                if self.match("="):
                    self.tokens.append(Token(TokenType.GTE, ">=", line, col))
                else:
                    self.tokens.append(Token(TokenType.GT, ">", line, col))
            elif ch == ".":
                self.tokens.append(Token(TokenType.DOT, ".", line, col))
                self.advance()
            elif ch == ",":
                self.tokens.append(Token(TokenType.COMMA, ",", line, col))
                self.advance()
            elif ch == ":":
                self.tokens.append(Token(TokenType.COLON, ":", line, col))
                self.advance()
            elif ch == ";":
                self.tokens.append(Token(TokenType.SEMICOLON, ";", line, col))
                self.advance()
            else:
                raise self.error(f"Unexpected character '{ch}'")

        while len(self.indent_stack) > 1:
            self.indent_stack.pop()
            self.tokens.append(Token(TokenType.DEDENT, 0, self.line, self.column))

        self.tokens.append(Token(TokenType.EOF, None, self.line, self.column))
        return self.tokens


def tokenize(source: str) -> list[Token]:
    return Lexer(source).tokenize()
`,"parser.py":`from __future__ import annotations

from magmascript.lang.tokens import Token, TokenType, KEYWORDS
from magmascript.lang import ast_nodes as ast
from magmascript.lang.util import suggest


# Token type to human-readable name
TOKEN_NAMES: dict[TokenType, str] = {
    TokenType.LPAREN: "'('",
    TokenType.RPAREN: "')'",
    TokenType.LBRACE: "'{'",
    TokenType.RBRACE: "'}'",
    TokenType.LBRACKET: "'['",
    TokenType.RBRACKET: "']'",
    TokenType.COMMA: "','",
    TokenType.COLON: "':'",
    TokenType.SEMICOLON: "';'",
    TokenType.EQ: "'='",
    TokenType.EQEQ: "'=='",
    TokenType.NEQ: "'!='",
    TokenType.LT: "'<'",
    TokenType.GT: "'>'",
    TokenType.LTE: "'<='",
    TokenType.GTE: "'>='",
    TokenType.PLUS: "'+'",
    TokenType.MINUS: "'-'",
    TokenType.STAR: "'*'",
    TokenType.SLASH: "'/'",
    TokenType.PERCENT: "'%'",
    TokenType.AND: "'and'",
    TokenType.OR: "'or'",
    TokenType.NOT: "'not'",
    TokenType.DOT: "'.'",
    TokenType.ARROW: "'->'",
    TokenType.IF: "'if'",
    TokenType.ELSE: "'else'",
    TokenType.FOR: "'for'",
    TokenType.IN: "'in'",
    TokenType.WHILE: "'while'",
    TokenType.FN: "'fn'",
    TokenType.RETURN: "'return'",
    TokenType.BREAK: "'break'",
    TokenType.CONTINUE: "'continue'",
    TokenType.PRINT: "'print'",
    TokenType.SPOOKED: "'spooked'",
    TokenType.INTENT: "'intent'",
    TokenType.FROM: "'from'",
    TokenType.AS: "'as'",
    TokenType.TRY: "'try'",
    TokenType.HAUNTER: "'haunter'",
    TokenType.THROW: "'throw'",
    TokenType.CLASS: "'class'",
    TokenType.SELF: "'self'",
    TokenType.NOT_IN: "'not in'",
    TokenType.TRUE: "'true'",
    TokenType.FALSE: "'false'",
    TokenType.NONE: "'none'",
    TokenType.NEWLINE: "newline",
    TokenType.EOF: "end of file",
}


def token_display(token: Token) -> str:
    name = TOKEN_NAMES.get(token.type, token.type.name)
    if token.type == TokenType.IDENTIFIER:
        return f"identifier '{token.value}'"
    if token.type == TokenType.NUMBER:
        return f"number {token.value}"
    if token.type == TokenType.STRING:
        kind, value = token.value
        preview = value[:20] + "..." if len(value) > 20 else value
        return f"string \\"{preview}\\""
    return name


class ParseError(Exception):
    def __init__(self, message: str, token: Token, source_line: str | None = None, filename: str | None = None) -> None:
        self.token = token
        self.source_line = source_line
        self.filename = filename
        self.message = message
        super().__init__(message)

    def format(self) -> str:
        parts = []
        loc = f"line {self.token.line}, column {self.token.column}"
        if self.filename:
            loc = f"{self.filename}:{loc}"
        parts.append(f"haunter at {loc}")

        if self.source_line is not None:
            line_num = str(self.token.line)
            padding = " " * len(line_num)
            parts.append(f"  {padding} |")
            parts.append(f"  {line_num} | {self.source_line}")
            caret = " " * (self.token.column - 1) + "^"
            parts.append(f"  {padding} | {caret}")

        parts.append(self.message)
        return "\\n".join(parts)


class Parser:
    def __init__(self, tokens: list[Token], source: str | None = None, filename: str | None = None) -> None:
        self.tokens = tokens
        self.source = source
        self.filename = filename
        self.pos = 0

    def peek(self) -> Token:
        return self.tokens[self.pos]

    def advance(self) -> Token:
        token = self.tokens[self.pos]
        self.pos += 1
        return token

    def _get_source_line(self, line_num: int) -> str | None:
        if self.source is None:
            return None
        lines = self.source.split("\\n")
        if 1 <= line_num <= len(lines):
            return lines[line_num - 1]
        return None

    def error(self, message: str, token: Token | None = None) -> ParseError:
        if token is None:
            token = self.peek()
        source_line = self._get_source_line(token.line)
        return ParseError(message, token, source_line, self.filename)

    def expect(self, token_type: TokenType) -> Token:
        token = self.peek()
        if token.type != token_type:
            expected = TOKEN_NAMES.get(token_type, token_type.name)
            got = token_display(token)
            raise self.error(f"Expected {expected}, got {got}", token)
        return self.advance()

    def match(self, *types: TokenType) -> Token | None:
        if self.peek().type in types:
            return self.advance()
        return None

    def check(self, *types: TokenType) -> bool:
        return self.peek().type in types

    def skip_newlines(self) -> None:
        while self.match(TokenType.NEWLINE):
            pass

    def parse(self) -> ast.Program:
        body = self.parse_body()
        return ast.Program(body=body)

    def parse_body(self) -> list[ast.ASTNode]:
        statements = []
        self.skip_newlines()
        while not self.check(TokenType.EOF):
            stmt = self.parse_statement()
            if stmt:
                statements.append(stmt)
            self.skip_newlines()
        return statements

    def parse_block(self) -> ast.Block:
        if self.match(TokenType.LBRACE):
            self.skip_newlines()
            body = []
            while not self.check(TokenType.RBRACE) and not self.check(TokenType.EOF):
                stmt = self.parse_statement()
                if stmt:
                    body.append(stmt)
                self.skip_newlines()
            self.expect(TokenType.RBRACE)
            return ast.Block(body=body)

        self.expect(TokenType.COLON)
        self.skip_newlines()
        self.expect(TokenType.INDENT)
        body = []
        while not self.check(TokenType.DEDENT) and not self.check(TokenType.EOF):
            stmt = self.parse_statement()
            if stmt:
                body.append(stmt)
            self.skip_newlines()
        self.expect(TokenType.DEDENT)
        return ast.Block(body=body)

    def parse_statement(self) -> ast.ASTNode | None:
        self.skip_newlines()

        if self.check(TokenType.IF):
            return self.parse_if()
        if self.check(TokenType.FOR):
            return self.parse_for()
        if self.check(TokenType.WHILE):
            return self.parse_while()
        if self.check(TokenType.FN):
            return self.parse_function_def()
        if self.check(TokenType.RETURN):
            return self.parse_return()
        if self.check(TokenType.BREAK):
            self.advance()
            return ast.BreakStatement(line=self.tokens[self.pos - 1].line)
        if self.check(TokenType.CONTINUE):
            self.advance()
            return ast.ContinueStatement(line=self.tokens[self.pos - 1].line)
        if self.check(TokenType.PRINT) or self.check(TokenType.IDENTIFIER) and self.peek().value == "print":
            return self.parse_print()
        if self.check(TokenType.FLOORPLAN):
            return self.parse_floorplan()
        if self.check(TokenType.SPOOKED):
            return self.parse_spooked()
        if self.check(TokenType.INTENT):
            return self.parse_import()
        if self.check(TokenType.TRY):
            return self.parse_try_catch()
        if self.check(TokenType.THROW):
            return self.parse_throw()
        if self.check(TokenType.CLASS):
            return self.parse_class_def()

        return self.parse_expression_statement()

    def parse_if(self) -> ast.IfExpression:
        token = self.expect(TokenType.IF)
        condition = self.parse_expression()
        then_block = self.parse_block()
        else_block = None

        self.skip_newlines()
        if self.check(TokenType.ELSE):
            self.advance()
            else_block = self.parse_block()

        return ast.IfExpression(
            condition=condition,
            then_block=then_block,
            else_block=else_block,
            line=token.line,
            column=token.column,
        )

    def parse_for(self) -> ast.ForLoop:
        token = self.expect(TokenType.FOR)
        var_token = self.expect(TokenType.IDENTIFIER)
        self.expect(TokenType.IN)
        iterable = self.parse_expression()
        body = self.parse_block()

        return ast.ForLoop(
            variable=var_token.value,
            iterable=iterable,
            body=body,
            line=token.line,
            column=token.column,
        )

    def parse_while(self) -> ast.WhileLoop:
        token = self.expect(TokenType.WHILE)
        condition = self.parse_expression()
        body = self.parse_block()

        return ast.WhileLoop(
            condition=condition,
            body=body,
            line=token.line,
            column=token.column,
        )

    def parse_function_def(self) -> ast.FunctionDef | ast.ArrowFunction:
        token = self.expect(TokenType.FN)

        if self.check(TokenType.IDENTIFIER):
            name = self.advance().value
            self.expect(TokenType.LPAREN)
            params, defaults = self.parse_params()
            self.expect(TokenType.RPAREN)
            body = self.parse_block()
            return ast.FunctionDef(
                name=name,
                params=params,
                defaults=defaults,
                body=body,
                line=token.line,
                column=token.column,
            )
        else:
            self.expect(TokenType.LPAREN)
            params, defaults = self.parse_params()
            self.expect(TokenType.RPAREN)
            body = self.parse_block()
            return ast.FunctionDef(
                name="",
                params=params,
                defaults=defaults,
                body=body,
                line=token.line,
                column=token.column,
            )

    def parse_params(self) -> tuple[list[str], dict[str, ast.ASTNode]]:
        params = []
        defaults = {}
        if not self.check(TokenType.RPAREN):
            # Accept both IDENTIFIER and SELF as parameter names
            token = self.peek()
            if token.type in (TokenType.IDENTIFIER, TokenType.SELF):
                params.append(self.advance().value)
                # Check for default value
                if self.match(TokenType.EQ):
                    defaults[params[-1]] = self.parse_expression()
            else:
                raise self.error("Expected parameter name", token)
            while self.match(TokenType.COMMA):
                token = self.peek()
                if token.type in (TokenType.IDENTIFIER, TokenType.SELF):
                    params.append(self.advance().value)
                    # Check for default value
                    if self.match(TokenType.EQ):
                        defaults[params[-1]] = self.parse_expression()
                else:
                    raise self.error("Expected parameter name", token)
        return params, defaults

    def parse_return(self) -> ast.ReturnStatement:
        token = self.expect(TokenType.RETURN)
        value = None
        if not self.check(TokenType.NEWLINE) and not self.check(TokenType.EOF) and not self.check(TokenType.RBRACE):
            value = self.parse_expression()
        return ast.ReturnStatement(value=value, line=token.line, column=token.column)

    def parse_print(self) -> ast.PrintStatement:
        if self.check(TokenType.IDENTIFIER) and self.peek().value == "print":
            token = self.advance()
        else:
            token = self.advance()
        self.expect(TokenType.LPAREN)
        args = []
        if not self.check(TokenType.RPAREN):
            args.append(self.parse_expression())
            while self.match(TokenType.COMMA):
                args.append(self.parse_expression())
        self.expect(TokenType.RPAREN)
        return ast.PrintStatement(arguments=args, line=token.line, column=token.column)

    def parse_spooked(self) -> ast.SpookedStatement:
        token = self.expect(TokenType.SPOOKED)
        self.expect(TokenType.LPAREN)
        message = self.parse_expression()
        self.expect(TokenType.RPAREN)
        return ast.SpookedStatement(message=message, line=token.line, column=token.column)

    def parse_import(self) -> ast.ImportStatement:
        token = self.expect(TokenType.INTENT)
        
        # Check for "intent { name1, name2 } from "module""
        if self.check(TokenType.LBRACE):
            self.advance()
            names = []
            while not self.check(TokenType.RBRACE):
                name_token = self.expect(TokenType.IDENTIFIER)
                names.append(name_token.value)
                if not self.check(TokenType.RBRACE):
                    self.expect(TokenType.COMMA)
            self.expect(TokenType.RBRACE)
            self.expect(TokenType.FROM)
            module_token = self.expect(TokenType.STRING)
            # Handle string token value - could be tuple (quote_type, value) or just string
            module_value = module_token.value[1] if isinstance(module_token.value, tuple) else module_token.value
            
            # Check for "as alias"
            alias = ""
            if self.check(TokenType.AS):
                self.advance()
                alias_token = self.expect(TokenType.IDENTIFIER)
                alias = alias_token.value
            
            return ast.ImportStatement(
                module=module_value,
                names=names,
                alias=alias,
                from_import=True,
                line=token.line,
                column=token.column,
            )
        
        # Simple import: "intent "module"" or "intent "module" as alias"
        module_token = self.expect(TokenType.STRING)
        # Handle string token value - could be tuple (quote_type, value) or just string
        module_value = module_token.value[1] if isinstance(module_token.value, tuple) else module_token.value
        
        alias = ""
        if self.check(TokenType.AS):
            self.advance()
            alias_token = self.expect(TokenType.IDENTIFIER)
            alias = alias_token.value
        
        return ast.ImportStatement(
            module=module_value,
            alias=alias,
            from_import=False,
            line=token.line,
            column=token.column,
        )

    def parse_try_catch(self) -> ast.TryCatch:
        token = self.expect(TokenType.TRY)
        try_block = self.parse_block()
        
        self.skip_newlines()
        self.expect(TokenType.HAUNTER)
        self.expect(TokenType.LPAREN)
        catch_param = self.expect(TokenType.IDENTIFIER).value
        self.expect(TokenType.RPAREN)
        catch_block = self.parse_block()
        
        return ast.TryCatch(
            try_block=try_block,
            catch_param=catch_param,
            catch_block=catch_block,
            line=token.line,
            column=token.column,
        )

    def parse_throw(self) -> ast.ThrowStatement:
        token = self.expect(TokenType.THROW)
        # Parse error type: "fire toad" or just an identifier
        if self.check(TokenType.IDENTIFIER) and self.peek().value == "fire":
            self.advance()  # consume 'fire'
            self.expect(TokenType.IDENTIFIER)  # consume 'toad'
            error_type = "fire toad"
        elif self.check(TokenType.IDENTIFIER):
            error_type = self.advance().value
        else:
            error_type = "fire toad"
        
        message = self.parse_expression()
        return ast.ThrowStatement(
            error_type=error_type,
            message=message,
            line=token.line,
            column=token.column,
        )

    def parse_floorplan(self) -> ast.FloorplanDef:
        """floorplan Name { field: type ... } - or the ':' INDENT form."""
        token = self.expect(TokenType.FLOORPLAN)
        name_token = self.expect(TokenType.IDENTIFIER)

        if self.match(TokenType.LBRACE):
            closer = TokenType.RBRACE
        else:
            self.expect(TokenType.COLON)
            self.skip_newlines()
            self.expect(TokenType.INDENT)
            closer = TokenType.DEDENT

        fields: list[ast.FloorplanField] = []
        self.skip_newlines()
        while not self.check(closer) and not self.check(TokenType.EOF):
            fields.append(self.parse_floorplan_field())
            self.match(TokenType.COMMA)
            self.skip_newlines()
        self.expect(closer)

        if not fields:
            raise self.error(
                f"floorplan {name_token.value} declares no fields", token
            )

        return ast.FloorplanDef(
            name=name_token.value,
            fields=fields,
            line=token.line,
            column=token.column,
        )

    def parse_floorplan_field(self) -> ast.FloorplanField:
        name_token = self.expect(TokenType.IDENTIFIER)
        self.expect(TokenType.COLON)
        type_token = self.expect(TokenType.IDENTIFIER)

        count = 1
        points_to = ""
        if self.match(TokenType.LBRACKET):
            # \`u8[16]\` is an array of 16; \`pine[Node]\` points at a Node.
            if self.check(TokenType.IDENTIFIER):
                points_to = self.advance().value
                if type_token.value != "pine":
                    raise self.error(
                        f"only a \`pine\` field can name what it points at, "
                        f"not \`{type_token.value}\`",
                        type_token,
                    )
            else:
                count_token = self.expect(TokenType.NUMBER)
                if not isinstance(count_token.value, int) or count_token.value < 1:
                    raise self.error(
                        f"array length must be a positive whole number, "
                        f"got {count_token.value}",
                        count_token,
                    )
                count = count_token.value
            self.expect(TokenType.RBRACKET)

        return ast.FloorplanField(
            name=name_token.value,
            type_name=type_token.value,
            count=count,
            points_to=points_to,
            line=name_token.line,
            column=name_token.column,
        )

    def parse_class_def(self) -> ast.ClassDef:
        token = self.expect(TokenType.CLASS)
        name_token = self.expect(TokenType.IDENTIFIER)
        
        # Support both brace block and indent block
        if self.match(TokenType.LBRACE):
            self.skip_newlines()
            methods = []
            while not self.check(TokenType.RBRACE) and not self.check(TokenType.EOF):
                if self.check(TokenType.FN):
                    methods.append(self.parse_function_def())
                else:
                    raise self.error("Expected method definition (fn) inside class", self.peek())
                self.skip_newlines()
            self.expect(TokenType.RBRACE)
        else:
            self.expect(TokenType.COLON)
            self.skip_newlines()
            self.expect(TokenType.INDENT)
            methods = []
            while not self.check(TokenType.DEDENT) and not self.check(TokenType.EOF):
                self.skip_newlines()
                if self.check(TokenType.FN):
                    methods.append(self.parse_function_def())
                else:
                    raise self.error("Expected method definition (fn) inside class", self.peek())
                self.skip_newlines()
            self.expect(TokenType.DEDENT)
        
        return ast.ClassDef(
            name=name_token.value,
            methods=methods,
            line=token.line,
            column=token.column,
        )

    def parse_expression_statement(self) -> ast.ASTNode:
        expr = self.parse_expression()

        if isinstance(expr, ast.Identifier):
            # Check for multi-assignment: a, b, c = 1, 2, 3
            if self.match(TokenType.COMMA):
                names = [expr.name]
                # Parse additional target names
                while True:
                    name_token = self.expect(TokenType.IDENTIFIER)
                    names.append(name_token.value)
                    if not self.match(TokenType.COMMA):
                        break
                self.expect(TokenType.EQ)
                # Parse RHS values
                values = [self.parse_expression()]
                while self.match(TokenType.COMMA):
                    if self.check(TokenType.NEWLINE) or self.check(TokenType.EOF):
                        break
                    values.append(self.parse_expression())
                return ast.MultiAssignment(
                    targets=names,
                    values=values,
                    op="=",
                    line=expr.line,
                    column=expr.column,
                )

            if self.match(TokenType.EQ):
                value = self.parse_expression()
                return ast.Assignment(
                    name=expr.name,
                    value=value,
                    op="=",
                    line=expr.line,
                    column=expr.column,
                )
            elif self.match(TokenType.PLUS_EQ):
                value = self.parse_expression()
                return ast.Assignment(
                    name=expr.name,
                    value=ast.BinaryOp(
                        op="+",
                        left=expr,
                        right=value,
                        line=expr.line,
                        column=expr.column,
                    ),
                    op="+=",
                    line=expr.line,
                    column=expr.column,
                )
            elif self.match(TokenType.MINUS_EQ):
                value = self.parse_expression()
                return ast.Assignment(
                    name=expr.name,
                    value=ast.BinaryOp(
                        op="-",
                        left=expr,
                        right=value,
                        line=expr.line,
                        column=expr.column,
                    ),
                    op="-=",
                    line=expr.line,
                    column=expr.column,
                )

        return ast.ExprStatement(expr=expr, line=expr.line, column=expr.column)

    def parse_expression(self) -> ast.ASTNode:
        return self.parse_assignment()

    def parse_assignment(self) -> ast.ASTNode:
        expr = self.parse_or()

        if isinstance(expr, ast.Identifier):
            if self.match(TokenType.EQ):
                value = self.parse_assignment()
                return ast.Assignment(
                    name=expr.name,
                    value=value,
                    op="=",
                    line=expr.line,
                    column=expr.column,
                )

        # Handle index assignment: obj[key] = value
        if isinstance(expr, ast.IndexAccess) and not isinstance(expr.index, ast.Slice):
            for tok, op in (
                (TokenType.EQ, "="),
                (TokenType.PLUS_EQ, "+="),
                (TokenType.MINUS_EQ, "-="),
            ):
                if self.match(tok):
                    value = self.parse_assignment()
                    return ast.IndexAssignment(
                        object=expr.object,
                        index=expr.index,
                        value=value,
                        op=op,
                        line=expr.line,
                        column=expr.column,
                    )

        # Handle property assignment: obj.prop = value
        if isinstance(expr, ast.PropertyAccess):
            if self.match(TokenType.EQ):
                value = self.parse_assignment()
                return ast.PropertyAssignment(
                    object=expr.object,
                    property=expr.property,
                    value=value,
                    op="=",
                    line=expr.line,
                    column=expr.column,
                )

        return expr

    def parse_or(self) -> ast.ASTNode:
        left = self.parse_and()
        while self.check(TokenType.OR):
            op = self.advance()
            right = self.parse_and()
            left = ast.BinaryOp(
                op="or",
                left=left,
                right=right,
                line=op.line,
                column=op.column,
            )
        return left

    def parse_and(self) -> ast.ASTNode:
        left = self.parse_equality()
        while self.check(TokenType.AND):
            op = self.advance()
            right = self.parse_equality()
            left = ast.BinaryOp(
                op="and",
                left=left,
                right=right,
                line=op.line,
                column=op.column,
            )
        return left

    def parse_equality(self) -> ast.ASTNode:
        left = self.parse_comparison()
        while self.check(TokenType.EQEQ, TokenType.NEQ):
            op = self.advance()
            right = self.parse_comparison()
            left = ast.BinaryOp(
                op=op.value,
                left=left,
                right=right,
                line=op.line,
                column=op.column,
            )
        return left

    def parse_comparison(self) -> ast.ASTNode:
        left = self.parse_in()
        while self.check(TokenType.LT, TokenType.GT, TokenType.LTE, TokenType.GTE):
            op = self.advance()
            right = self.parse_in()
            left = ast.BinaryOp(
                op=op.value,
                left=left,
                right=right,
                line=op.line,
                column=op.column,
            )
        return left

    def parse_in(self) -> ast.ASTNode:
        left = self.parse_addition()
        while self.check(TokenType.IN) or self.check(TokenType.NOT_IN):
            op = self.advance()
            right = self.parse_addition()
            op_str = "not in" if op.type == TokenType.NOT_IN else "in"
            left = ast.BinaryOp(
                op=op_str,
                left=left,
                right=right,
                line=op.line,
                column=op.column,
            )
        return left

    def parse_addition(self) -> ast.ASTNode:
        left = self.parse_multiplication()
        while self.check(TokenType.PLUS, TokenType.MINUS):
            op = self.advance()
            right = self.parse_multiplication()
            left = ast.BinaryOp(
                op=op.value,
                left=left,
                right=right,
                line=op.line,
                column=op.column,
            )
        return left

    def parse_multiplication(self) -> ast.ASTNode:
        left = self.parse_unary()
        while self.check(TokenType.STAR, TokenType.SLASH, TokenType.PERCENT):
            op = self.advance()
            right = self.parse_unary()
            left = ast.BinaryOp(
                op=op.value,
                left=left,
                right=right,
                line=op.line,
                column=op.column,
            )
        return left

    def parse_unary(self) -> ast.ASTNode:
        if self.check(TokenType.MINUS):
            op = self.advance()
            operand = self.parse_unary()
            return ast.UnaryOp(op="-", operand=operand, line=op.line, column=op.column)
        if self.check(TokenType.NOT):
            op = self.advance()
            operand = self.parse_unary()
            return ast.UnaryOp(op="not", operand=operand, line=op.line, column=op.column)
        return self.parse_postfix()

    def parse_postfix(self) -> ast.ASTNode:
        expr = self.parse_primary()

        while True:
            if self.match(TokenType.DOT):
                prop = self.expect(TokenType.IDENTIFIER)
                if self.check(TokenType.LPAREN):
                    self.advance()
                    args = self.parse_arguments()
                    self.expect(TokenType.RPAREN)
                    expr = ast.MethodCall(
                        object=expr,
                        method=prop.value,
                        arguments=args,
                        line=prop.line,
                        column=prop.column,
                    )
                else:
                    expr = ast.PropertyAccess(
                        object=expr,
                        property=prop.value,
                        line=prop.line,
                        column=prop.column,
                    )
            elif self.match(TokenType.LBRACKET):
                # Check if this is a slice (starts with ':' or is '[]')
                if self.check(TokenType.COLON) or self.check(TokenType.RBRACKET):
                    # Slice with no start: [:stop] or [::step] or [:stop:step]
                    start = None
                    stop = None
                    step = None
                    if self.match(TokenType.COLON):
                        if not self.check(TokenType.RBRACKET) and not self.check(TokenType.COLON):
                            stop = self.parse_expression()
                    if self.match(TokenType.COLON):
                        if not self.check(TokenType.RBRACKET):
                            step = self.parse_expression()
                    self.expect(TokenType.RBRACKET)
                    expr = ast.IndexAccess(
                        object=expr,
                        index=ast.Slice(start=start, stop=stop, step=step, line=expr.line, column=expr.column),
                        line=expr.line,
                        column=expr.column,
                    )
                else:
                    first = self.parse_expression()
                    if self.match(TokenType.COLON):
                        # This is a slice: first:...
                        stop = None
                        step = None
                        if not self.check(TokenType.RBRACKET) and not self.check(TokenType.COLON):
                            stop = self.parse_expression()
                        if self.match(TokenType.COLON):
                            if not self.check(TokenType.RBRACKET):
                                step = self.parse_expression()
                        self.expect(TokenType.RBRACKET)
                        expr = ast.IndexAccess(
                            object=expr,
                            index=ast.Slice(start=first, stop=stop, step=step, line=first.line, column=first.column),
                            line=expr.line,
                            column=expr.column,
                        )
                    else:
                        self.expect(TokenType.RBRACKET)
                        expr = ast.IndexAccess(
                            object=expr,
                            index=first,
                            line=expr.line,
                            column=expr.column,
                        )
            elif self.check(TokenType.LPAREN):
                self.advance()
                args = self.parse_arguments()
                self.expect(TokenType.RPAREN)
                expr = ast.FunctionCall(
                    callee=expr,
                    arguments=args,
                    line=expr.line,
                    column=expr.column,
                )
            else:
                break

        return expr

    def parse_primary(self) -> ast.ASTNode:
        token = self.peek()

        if self.match(TokenType.NUMBER):
            return ast.NumberLiteral(value=token.value, line=token.line, column=token.column)

        if self.match(TokenType.STRING):
            kind, value = token.value
            if kind == "interpolated":
                parts = self.parse_interpolation(value)
                return ast.InterpolatedString(parts=parts, line=token.line, column=token.column)
            return ast.StringLiteral(value=value, line=token.line, column=token.column)

        if self.match(TokenType.TRUE):
            return ast.BoolLiteral(value=True, line=token.line, column=token.column)

        if self.match(TokenType.FALSE):
            return ast.BoolLiteral(value=False, line=token.line, column=token.column)

        if self.match(TokenType.NONE):
            return ast.NoneLiteral(line=token.line, column=token.column)

        if self.match(TokenType.IDENTIFIER):
            name_token = self.tokens[self.pos - 1]
            if self.check(TokenType.ARROW):
                self.advance()
                body_expr = self.parse_expression()
                return ast.ArrowFunction(
                    params=[name_token.value],
                    body=body_expr,
                    line=name_token.line,
                    column=name_token.column,
                )
            return ast.Identifier(name=name_token.value, line=name_token.line, column=name_token.column)

        # Treat 'self' as an identifier in expressions
        if self.match(TokenType.SELF):
            name_token = self.tokens[self.pos - 1]
            return ast.Identifier(name="self", line=name_token.line, column=name_token.column)

        if self.match(TokenType.LPAREN):
            expr = self.parse_expression()
            self.expect(TokenType.RPAREN)
            return expr

        if self.match(TokenType.LBRACKET):
            elements = []
            if not self.check(TokenType.RBRACKET):
                first_expr = self.parse_expression()
                if self.check(TokenType.FOR):
                    self.advance()
                    var_token = self.expect(TokenType.IDENTIFIER)
                    self.expect(TokenType.IN)
                    iterable = self.parse_expression()
                    condition = None
                    if self.check(TokenType.IF):
                        self.advance()
                        condition = self.parse_expression()
                    self.expect(TokenType.RBRACKET)
                    return ast.ListComprehension(
                        element=first_expr,
                        variable=var_token.value,
                        iterable=iterable,
                        condition=condition,
                        line=token.line,
                        column=token.column,
                    )
                elements.append(first_expr)
                while self.match(TokenType.COMMA):
                    if self.check(TokenType.RBRACKET):
                        break
                    elements.append(self.parse_expression())
            self.expect(TokenType.RBRACKET)
            return ast.ListLiteral(elements=elements, line=token.line, column=token.column)

        if self.match(TokenType.LBRACE):
            keys = []
            values = []
            if not self.check(TokenType.RBRACE):
                key = self.parse_expression()
                self.expect(TokenType.COLON)
                value = self.parse_expression()
                keys.append(key)
                values.append(value)
                while self.match(TokenType.COMMA):
                    if self.check(TokenType.RBRACE):
                        break
                    key = self.parse_expression()
                    self.expect(TokenType.COLON)
                    value = self.parse_expression()
                    keys.append(key)
                    values.append(value)
            self.expect(TokenType.RBRACE)
            return ast.DictLiteral(keys=keys, values=values, line=token.line, column=token.column)

        if self.match(TokenType.FN):
            self.expect(TokenType.LPAREN)
            params, defaults = self.parse_params()
            self.expect(TokenType.RPAREN)
            if self.match(TokenType.ARROW):
                body_expr = self.parse_expression()
                return ast.ArrowFunction(
                    params=params,
                    defaults=defaults,
                    body=body_expr,
                    line=token.line,
                    column=token.column,
                )
            else:
                body = self.parse_block()
                return ast.FunctionDef(
                    name="",
                    params=params,
                    defaults=defaults,
                    body=body,
                    line=token.line,
                    column=token.column,
                )

        got = token_display(token)
        msg = f"Unexpected {got}"

        if token.type == TokenType.IDENTIFIER:
            kw = suggest(token.value, list(KEYWORDS.keys()))
            if kw:
                msg += f" — did you mean '{kw}'?"

        raise self.error(msg, token)

    def parse_interpolation(self, template: str) -> list[ast.ASTNode]:
        parts = []
        i = 0
        while i < len(template):
            if template[i] == "{":
                j = i + 1
                depth = 1
                while j < len(template) and depth > 0:
                    if template[j] == "{":
                        depth += 1
                    elif template[j] == "}":
                        depth -= 1
                    j += 1
                inner = template[i + 1:j - 1]
                inner_tokens = _tokenize_expression(inner)
                inner_parser = Parser(inner_tokens)
                parts.append(inner_parser.parse_expression())
                i = j
            else:
                start = i
                while i < len(template) and template[i] != "{":
                    i += 1
                text = template[start:i]
                if text:
                    parts.append(ast.StringLiteral(value=text))
        return parts

    def parse_arguments(self) -> list[ast.ASTNode]:
        args = []
        if not self.check(TokenType.RPAREN):
            args.append(self.parse_expression())
            while self.match(TokenType.COMMA):
                if self.check(TokenType.RPAREN):
                    break
                args.append(self.parse_expression())
        return args


def _tokenize_expression(source: str) -> list[Token]:
    from magmascript.lang.lexer import Lexer
    lexer = Lexer(source)
    tokens = lexer.tokenize()
    filtered = [t for t in tokens if t.type not in (TokenType.NEWLINE, TokenType.INDENT, TokenType.DEDENT)]
    return filtered


def parse(source: str) -> ast.Program:
    from magmascript.lang.lexer import tokenize
    tokens = tokenize(source)
    parser = Parser(tokens)
    return parser.parse()
`,"pretty.py":`"""AST pretty-printer. Unparses AST nodes back to .mgs source code.

Usage::

    from magmascript.lang.pretty import unparse
    source = unparse(program)
"""

from __future__ import annotations

from magmascript.lang import ast_nodes as ast


def unparse(node: ast.ASTNode, indent: int = 0) -> str:
    """Convert an AST node back to .mgs source code."""
    method = getattr(_Unparser, f"_unparse_{type(node).__name__}", None)
    if method:
        return method(node, indent)
    return f"/* unknown: {type(node).__name__} */"


class _Unparser:
    @staticmethod
    def _unparse_Program(node: ast.Program, indent: int) -> str:
        return "\\n\\n".join(unparse(stmt, indent) for stmt in node.body)

    @staticmethod
    def _unparse_Block(node: ast.Block, indent: int) -> str:
        if not node.body:
            return "{ }"
        inner = "\\n".join(unparse(stmt, indent + 1) for stmt in node.body)
        return "{\\n" + _indent(inner, indent + 1) + "\\n" + _indent("}", indent)

    @staticmethod
    def _unparse_NumberLiteral(node: ast.NumberLiteral, indent: int) -> str:
        if isinstance(node.value, float):
            s = str(node.value)
            if "." not in s and "e" not in s.lower():
                s += ".0"
            return s
        return str(node.value)

    @staticmethod
    def _unparse_StringLiteral(node: ast.StringLiteral, indent: int) -> str:
        if node.interpolated:
            return f'f"{node.value}"'
        return f'"{node.value}"'

    @staticmethod
    def _unparse_BoolLiteral(node: ast.BoolLiteral, indent: int) -> str:
        return "true" if node.value else "false"

    @staticmethod
    def _unparse_NoneLiteral(node: ast.NoneLiteral, indent: int) -> str:
        return "none"

    @staticmethod
    def _unparse_Identifier(node: ast.Identifier, indent: int) -> str:
        return node.name

    @staticmethod
    def _unparse_BinaryOp(node: ast.BinaryOp, indent: int) -> str:
        return f"{unparse(node.left, indent)} {node.op} {unparse(node.right, indent)}"

    @staticmethod
    def _unparse_UnaryOp(node: ast.UnaryOp, indent: int) -> str:
        return f"{node.op}{unparse(node.operand, indent)}"

    @staticmethod
    def _unparse_FunctionCall(node: ast.FunctionCall, indent: int) -> str:
        args = ", ".join(unparse(a, indent) for a in node.arguments)
        return f"{unparse(node.callee, indent)}({args})"

    @staticmethod
    def _unparse_MethodCall(node: ast.MethodCall, indent: int) -> str:
        args = ", ".join(unparse(a, indent) for a in node.arguments)
        return f"{unparse(node.object, indent)}.{node.method}({args})"

    @staticmethod
    def _unparse_PropertyAccess(node: ast.PropertyAccess, indent: int) -> str:
        return f"{unparse(node.object, indent)}.{node.property}"

    @staticmethod
    def _unparse_IndexAccess(node: ast.IndexAccess, indent: int) -> str:
        if isinstance(node.index, ast.Slice):
            s = _unparse_slice(node.index)
            return f"{unparse(node.object, indent)}[{s}]"
        return f"{unparse(node.object, indent)}[{unparse(node.index, indent)}]"

    @staticmethod
    def _unparse_ListLiteral(node: ast.ListLiteral, indent: int) -> str:
        elems = ", ".join(unparse(e, indent) for e in node.elements)
        return f"[{elems}]"

    @staticmethod
    def _unparse_DictLiteral(node: ast.DictLiteral, indent: int) -> str:
        pairs = []
        for k, v in zip(node.keys, node.values):
            pairs.append(f"{unparse(k, indent)}: {unparse(v, indent)}")
        return "{" + ", ".join(pairs) + "}"

    @staticmethod
    def _unparse_ListComprehension(node: ast.ListComprehension, indent: int) -> str:
        parts = [f"{unparse(node.element, indent)} for {node.variable} in {unparse(node.iterable, indent)}"]
        if node.condition:
            parts.append(f" if {unparse(node.condition, indent)}")
        return "[" + "".join(parts) + "]"

    @staticmethod
    def _unparse_Assignment(node: ast.Assignment, indent: int) -> str:
        if node.op == "=":
            return f"{node.name} = {unparse(node.value, indent)}"
        return f"{node.name} {node.op} {unparse(node.value, indent)}"

    @staticmethod
    def _unparse_MultiAssignment(node: ast.MultiAssignment, indent: int) -> str:
        targets = ", ".join(node.targets)
        values = ", ".join(unparse(v, indent) for v in node.values)
        if node.op == "=":
            return f"{targets} = {values}"
        return f"{targets} {node.op} {values}"

    @staticmethod
    def _unparse_PropertyAssignment(node: ast.PropertyAssignment, indent: int) -> str:
        obj = unparse(node.object, indent)
        val = unparse(node.value, indent)
        if node.op == "=":
            return f"{obj}.{node.property} = {val}"
        return f"{obj}.{node.property} {node.op} {val}"

    @staticmethod
    def _unparse_IndexAssignment(node: ast.IndexAssignment, indent: int) -> str:
        obj = unparse(node.object, indent)
        idx = unparse(node.index, indent)
        val = unparse(node.value, indent)
        if node.op == "=":
            return f"{obj}[{idx}] = {val}"
        return f"{obj}[{idx}] {node.op} {val}"

    @staticmethod
    def _unparse_ExprStatement(node: ast.ExprStatement, indent: int) -> str:
        return unparse(node.expr, indent)

    @staticmethod
    def _unparse_PrintStatement(node: ast.PrintStatement, indent: int) -> str:
        args = ", ".join(unparse(a, indent) for a in node.arguments)
        return f"print({args})"

    @staticmethod
    def _unparse_SpookedStatement(node: ast.SpookedStatement, indent: int) -> str:
        return f"spooked({unparse(node.message, indent)})"

    @staticmethod
    def _unparse_ReturnStatement(node: ast.ReturnStatement, indent: int) -> str:
        if node.value:
            return f"return {unparse(node.value, indent)}"
        return "return"

    @staticmethod
    def _unparse_BreakStatement(node: ast.BreakStatement, indent: int) -> str:
        return "break"

    @staticmethod
    def _unparse_ContinueStatement(node: ast.ContinueStatement, indent: int) -> str:
        return "continue"

    @staticmethod
    def _unparse_IfExpression(node: ast.IfExpression, indent: int) -> str:
        parts = [f"if {unparse(node.condition, indent)} {unparse(node.then_block, indent)}"]
        if node.else_block:
            if isinstance(node.else_block, ast.IfExpression):
                parts.append(f"else {unparse(node.else_block, indent)}")
            else:
                parts.append(f"else {unparse(node.else_block, indent)}")
        return " ".join(parts)

    @staticmethod
    def _unparse_ForLoop(node: ast.ForLoop, indent: int) -> str:
        return f"for {node.variable} in {unparse(node.iterable, indent)} {unparse(node.body, indent)}"

    @staticmethod
    def _unparse_WhileLoop(node: ast.WhileLoop, indent: int) -> str:
        return f"while {unparse(node.condition, indent)} {unparse(node.body, indent)}"

    @staticmethod
    def _unparse_FunctionDef(node: ast.FunctionDef, indent: int) -> str:
        params = _format_params(node.params, node.defaults)
        return f"fn {node.name}({params}) {unparse(node.body, indent)}"

    @staticmethod
    def _unparse_ArrowFunction(node: ast.ArrowFunction, indent: int) -> str:
        params = _format_params(node.params, node.defaults)
        if isinstance(node.body, ast.Block):
            return f"fn({params}) {unparse(node.body, indent)}"
        return f"fn({params}) -> {unparse(node.body, indent)}"

    @staticmethod
    def _unparse_ClassDef(node: ast.ClassDef, indent: int) -> str:
        methods = "\\n".join(unparse(m, indent + 1) for m in node.methods)
        return f"class {node.name} {{\\n{_indent(methods, indent + 1)}\\n{_indent('}', indent)}}"

    @staticmethod
    def _unparse_FloorplanDef(node: ast.FloorplanDef, indent: int) -> str:
        fields = []
        for f in node.fields:
            if f.count:
                fields.append(f"{f.name}: {f.type_name}[{f.count}]")
            elif f.points_to:
                fields.append(f"{f.name}: pine[{f.points_to}]")
            else:
                fields.append(f"{f.name}: {f.type_name}")
        body = "\\n".join(_indent(f, indent + 1) for f in fields)
        return f"floorplan {node.name} {{\\n{body}\\n{_indent('}', indent)}}"

    @staticmethod
    def _unparse_TryCatch(node: ast.TryCatch, indent: int) -> str:
        body = unparse(node.try_block, indent)
        catch = unparse(node.catch_block, indent)
        param = f"({node.catch_param})" if node.catch_param else ""
        return f"try {body} haunter{param} {catch}"

    @staticmethod
    def _unparse_ThrowStatement(node: ast.ThrowStatement, indent: int) -> str:
        msg = unparse(node.message, indent)
        if node.error_type == "fire toad":
            return f"throw fire toad({msg})"
        return f"throw {node.error_type}({msg})"

    @staticmethod
    def _unparse_ImportStatement(node: ast.ImportStatement, indent: int) -> str:
        if node.from_import:
            names = ", ".join(node.names)
            if node.alias:
                return f"intent {{ {names} }} from \\"{node.module}\\" as {node.alias}"
            return f"intent {{ {names} }} from \\"{node.module}\\""
        if node.alias:
            return f"intent \\"{node.module}\\" as {node.alias}"
        return f"intent \\"{node.module}\\""


def _indent(text: str, level: int) -> str:
    prefix = "    " * level
    return "\\n".join(prefix + line if line.strip() else "" for line in text.split("\\n"))


def _format_params(params: list[str], defaults: dict[str, ast.ASTNode]) -> str:
    parts = []
    for p in params:
        if p in defaults:
            parts.append(f"{p} = {unparse(defaults[p])}")
        else:
            parts.append(p)
    return ", ".join(parts)


def _unparse_slice(node: ast.Slice) -> str:
    parts = []
    parts.append(unparse(node.start) if node.start else "")
    parts.append(unparse(node.stop) if node.stop else "")
    if node.step:
        parts.append(unparse(node.step))
    return ":".join(parts)
`,"tokens.py":'from __future__ import annotations\n\nfrom enum import Enum, auto\nfrom dataclasses import dataclass\nfrom typing import Any\n\n\nclass TokenType(Enum):\n    # Literals\n    NUMBER = auto()\n    STRING = auto()\n    IDENTIFIER = auto()\n    TRUE = auto()\n    FALSE = auto()\n    NONE = auto()\n\n    # Operators\n    PLUS = auto()\n    MINUS = auto()\n    STAR = auto()\n    SLASH = auto()\n    PERCENT = auto()\n    EQ = auto()\n    EQEQ = auto()\n    NEQ = auto()\n    LT = auto()\n    GT = auto()\n    LTE = auto()\n    GTE = auto()\n    AND = auto()\n    OR = auto()\n    NOT = auto()\n    DOT = auto()\n    ARROW = auto()\n    PLUS_EQ = auto()\n    MINUS_EQ = auto()\n    NOT_IN = auto()\n\n    # Delimiters\n    LPAREN = auto()\n    RPAREN = auto()\n    LBRACE = auto()\n    RBRACE = auto()\n    LBRACKET = auto()\n    RBRACKET = auto()\n    COMMA = auto()\n    COLON = auto()\n    SEMICOLON = auto()\n\n    # Keywords\n    IF = auto()\n    ELSE = auto()\n    FOR = auto()\n    IN = auto()\n    WHILE = auto()\n    FN = auto()\n    RETURN = auto()\n    BREAK = auto()\n    CONTINUE = auto()\n    PRINT = auto()\n    SPOOKED = auto()\n    INTENT = auto()\n    FROM = auto()\n    AS = auto()\n    TRY = auto()\n    HAUNTER = auto()\n    THROW = auto()\n    CLASS = auto()\n    SELF = auto()\n    FLOORPLAN = auto()\n\n    # Special\n    NEWLINE = auto()\n    INDENT = auto()\n    DEDENT = auto()\n    EOF = auto()\n\n\nKEYWORDS: dict[str, TokenType] = {\n    "true": TokenType.TRUE,\n    "false": TokenType.FALSE,\n    "none": TokenType.NONE,\n    "if": TokenType.IF,\n    "else": TokenType.ELSE,\n    "for": TokenType.FOR,\n    "in": TokenType.IN,\n    "while": TokenType.WHILE,\n    "fn": TokenType.FN,\n    "return": TokenType.RETURN,\n    "break": TokenType.BREAK,\n    "continue": TokenType.CONTINUE,\n    "and": TokenType.AND,\n    "or": TokenType.OR,\n    "not": TokenType.NOT,\n    "print": TokenType.PRINT,\n    "spooked": TokenType.SPOOKED,\n    "intent": TokenType.INTENT,\n    "from": TokenType.FROM,\n    "as": TokenType.AS,\n    "try": TokenType.TRY,\n    "haunter": TokenType.HAUNTER,\n    "throw": TokenType.THROW,\n    "class": TokenType.CLASS,\n    "self": TokenType.SELF,\n    "floorplan": TokenType.FLOORPLAN,\n}\n\n\n@dataclass\nclass Token:\n    type: TokenType\n    value: Any\n    line: int\n    column: int\n\n    def __repr__(self) -> str:\n        return f"Token({self.type.name}, {self.value!r}, line={self.line})"\n',"util.py":"from __future__ import annotations\n\n\ndef levenshtein(a: str, b: str) -> int:\n    if a == b:\n        return 0\n    if not a:\n        return len(b)\n    if not b:\n        return len(a)\n\n    a_len, b_len = len(a), len(b)\n    matrix = [[0] * (b_len + 1) for _ in range(a_len + 1)]\n\n    for i in range(a_len + 1):\n        matrix[i][0] = i\n    for j in range(b_len + 1):\n        matrix[0][j] = j\n\n    for i in range(1, a_len + 1):\n        for j in range(1, b_len + 1):\n            cost = 0 if a[i - 1] == b[j - 1] else 1\n            matrix[i][j] = min(\n                matrix[i - 1][j] + 1,\n                matrix[i][j - 1] + 1,\n                matrix[i - 1][j - 1] + cost,\n            )\n\n    return matrix[a_len][b_len]\n\n\ndef suggest(name: str, candidates: list[str], max_distance: int = 2) -> str | None:\n    best: str | None = None\n    best_distance = max_distance + 1\n\n    for candidate in candidates:\n        d = levenshtein(name.lower(), candidate.lower())\n        if d < best_distance:\n            best_distance = d\n            best = candidate\n\n    if best_distance <= max_distance:\n        return best\n    return None\n","visitor.py":'"""AST visitor and transformer base classes.\n\nProvides a generic traversal framework for the MagmaScript AST.\nSubclass Visitor for read-only passes, Transformer for AST rewrites.\n\nUsage::\n\n    from magmascript.lang.visitor import Visitor\n\n    class MyChecker(Visitor):\n        def visit_Identifier(self, node):\n            if node.name == "bad":\n                self.report(node)\n\n        def visit_FunctionDef(self, node):\n            # Custom handling, then recurse into body\n            self.visit(node.body)\n\n    checker = MyChecker()\n    checker.visit(program)\n"""\n\nfrom __future__ import annotations\n\nfrom magmascript.lang import ast_nodes as ast\n\n\ndef children(node: ast.ASTNode) -> list[ast.ASTNode]:\n    """Extract all ASTNode children from a node.\n\n    Handles dataclass fields, lists, and dicts (used by FunctionDef.defaults).\n    """\n    out: list[ast.ASTNode] = []\n    for value in vars(node).values():\n        if isinstance(value, ast.ASTNode):\n            out.append(value)\n        elif isinstance(value, list):\n            out.extend(v for v in value if isinstance(v, ast.ASTNode))\n        elif isinstance(value, dict):\n            out.extend(v for v in value.values() if isinstance(v, ast.ASTNode))\n    return out\n\n\nclass Visitor:\n    """Read-only AST visitor. Subclass and override visit_<NodeType> methods.\n\n    The default visit() method recurses into children automatically.\n    Override a visit method to customize traversal for that node type.\n    """\n\n    def visit(self, node: ast.ASTNode | None) -> None:\n        if node is None:\n            return\n        method = getattr(self, f"visit_{type(node).__name__}", None)\n        if method is not None:\n            method(node)\n        else:\n            self._default_visit(node)\n\n    def _default_visit(self, node: ast.ASTNode) -> None:\n        for child in children(node):\n            self.visit(child)\n\n\nclass Transformer:\n    """AST transformer. Subclass and override visit_<NodeType> methods.\n\n    Each visit method should return a (possibly modified) node.\n    The default transform() recurses into children and returns the original node.\n    """\n\n    def transform(self, node: ast.ASTNode | None) -> ast.ASTNode | None:\n        if node is None:\n            return None\n        method = getattr(self, f"visit_{type(node).__name__}", None)\n        if method is not None:\n            return method(node)\n        return self._default_transform(node)\n\n    def _default_transform(self, node: ast.ASTNode) -> ast.ASTNode:\n        for field_name, value in vars(node).items():\n            if isinstance(value, ast.ASTNode):\n                setattr(node, field_name, self.transform(value))\n            elif isinstance(value, list):\n                new_list = []\n                for item in value:\n                    if isinstance(item, ast.ASTNode):\n                        new_list.append(self.transform(item))\n                    else:\n                        new_list.append(item)\n                setattr(node, field_name, new_list)\n            elif isinstance(value, dict):\n                new_dict = {}\n                for k, v in value.items():\n                    if isinstance(v, ast.ASTNode):\n                        new_dict[k] = self.transform(v)\n                    else:\n                        new_dict[k] = v\n                setattr(node, field_name, new_dict)\n        return node\n'};
