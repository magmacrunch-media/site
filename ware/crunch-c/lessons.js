export const MODULES=[{"slug":"01-types","number":"01","title":"Module 01: Types","html":"<h2>The C Concept</h2><p>In C, the <code>&lt;stdint.h&gt;</code> types have fixed sizes. A <code>uint8_t</code> can only hold 0–255. An <code>int32_t</code> can hold roughly -2 billion to +2 billion. (Plain <code>int</code> and <code>long</code> are the ones that are <strong>not</strong> fixed: their widths are implementation-defined, which is exactly why portable code reaches for the <code>uint8_t</code>/<code>int32_t</code> names.)</p><p>What happens when you exceed the range depends on the sign, and the difference matters more than it looks:</p><ul><li><strong>Unsigned types wrap</strong>, silently and by guarantee. <code>uint8_t</code> 255 + 1 is 0. The standard says so, and you can rely on it.</li><li><strong>Signed overflow is undefined behavior.</strong> Not a wrap, not a promise of anything. The compiler is entitled to assume it never happens and optimise on that basis, so the symptom can be code that vanished rather than a wrong number.</li></ul><p>Both are among the most common sources of bugs in C programs. The signed one is the more dangerous, because testing it on your machine tells you nothing about what it does on someone else's.</p><p>C also has implicit type promotion: when you add an <code>int</code> and a <code>char</code>, the <code>char</code> is silently promoted to <code>int</code>. This is well-defined but confusing, and it's one of C's worst-understood corners.</p><h2>What You'll See</h2><ul><li>Fixed-width integers (<code>i8</code>, <code>u16</code>, <code>i32</code>, etc.) and their ranges</li><li>Wrapping behavior: what happens when <code>u8</code> goes above 255</li><li>Signed underflow: what happens when <code>i8</code> drops below -128</li><li>Truncating division: <code>-7 / 2</code> is <code>-3</code>, not <code>-4</code></li><li>No integer promotion: <code>i32 + u8</code> is an error, not silent promotion</li></ul><h3>Where crunch-c differs from C</h3><p>Two deliberate divergences, both worth holding onto:</p><ul><li><strong>crunch-c wraps and warns on signed overflow too.</strong> Real C gives you undefined behavior with no warning at all. The sandbox shows you the shape of the bug; C would show you nothing, or something worse.</li><li><strong>crunch-c has no integer promotion.</strong> <code>i32 + u8</code> is an error here, where C would quietly promote and carry on. This is the course refusing to hide a conversion from you, not a claim about how C behaves.</li></ul>","count":3},{"slug":"02-pointers","number":"02","title":"Module 02: Pointers","html":`<h2>The C Concept</h2><p>A pointer is a variable that holds a memory address. In C, a pointer lets you dereference null, read memory that has been freed, or walk off the end of an array, and the compiler stops none of it.</p><p>In crunch-c, pointers are called <code>pine</code> (a play on "pointer" and "pine": something that points upward). You allocate memory with <code>garrison</code> and free it with <code>scorch</code>.</p><h2>What You'll See</h2><ul><li>Allocating memory: <code>garrison(n)</code> claims n bytes</li><li>Reading/writing: <code>p[i]</code> for byte access, <code>p.peek(i32)</code> for typed access</li><li>Pointer arithmetic: <code>p + 1</code> shifts the pointer forward</li><li>Freeing memory: <code>scorch(p)</code> releases the block</li></ul><h2>Two Tools For Looking At Memory</h2><p>The course uses both of these from here on, so meet them now.</p><h3><code>bathysphere(p)</code>: dump the raw bytes</h3><p><code>bathysphere</code> prints a block exactly as it sits in memory, with no interpretation: a header line describing the block, then a hex dump.</p><pre><code>pine 0x0008 (4 bytes, alive, garrisoned at line 11)
  0008  e8 03 00 00                                         |....|</code></pre><p>Reading that: the block lives at address <code>0x0008</code>, it is 4 bytes long, it has not been scorched yet, and it was allocated at line 11. Then the dump: offset on the left, the bytes in hex, and the same bytes as printable characters on the right (a <code>.</code> stands in for anything unprintable).</p><p>This is the tool that makes the invisible visible. <code>peek(i32)</code> tells you a block holds 1000; <code>bathysphere</code> shows you it holds <code>e8 03 00 00</code>, which is where endianness stops being a word and starts being something you can see.</p><h3><code>.arena</code>: list every live block</h3><p><code>.arena</code> is a REPL command, not a function, so it works inside <code>magmascript repl</code> rather than in a <code>.mgs</code> file. Run some code, then type <code>.arena</code>, and you get every block still allocated: where it lives, how big it is, and which line garrisoned it.</p><p>That last column is what makes it useful. When the run ends with an ancient-weeds warning about a leak, <code>.arena</code> is how you find out what is still holding memory and where it came from.</p><h2>A Note On <code>while</code></h2><p>From Exercise 03 onward the exercises loop:</p><pre><code>i = 0
while i &lt; 4 {
    print(f"i = {i}")
    i = i + 1
}</code></pre><p>If you have written a loop in any other language this is the shape you expect, minus the parentheses around the condition.</p><p>crunch-c does have <code>for</code> (<code>for i in range(4) { ... }</code>), and it is the nicer loop. The exercises use <code>while</code> anyway, on purpose: walking memory means holding an index you increment yourself and choosing when to stop, and that is what a <code>for</code> hides. C's own <code>for</code> is shorthand for exactly the setup-test- increment above. Write the long form a few times and the shorthand stops being magic.</p>`,"count":4},{"slug":"03-faults","number":"03","title":"Module 03: Memory Faults","html":"<h2>The C Concept</h2><p>In C, memory errors are silent. Use-after-free, out-of-bounds access, double-free, memory leaks: they all produce undefined behavior. Sometimes crashes, sometimes security vulnerabilities, sometimes nothing at all.</p><p>In crunch-c, every memory fault is caught and named:</p><table><thead><tr><th>Fault</th><th>C Equivalent</th><th>crunch-c Name</th></tr></thead><tbody><tr><td>Use-after-free</td><td>Undefined behavior</td><td><code>quicksand</code></td></tr><tr><td>Out-of-bounds</td><td>Buffer overflow</td><td><code>area does not exist</code></td></tr><tr><td>Double-free</td><td>Undefined behavior</td><td><code>quicksand</code></td></tr><tr><td>Memory leak</td><td>Memory leak</td><td><code>ancient weeds</code></td></tr></tbody></table>","count":4},{"slug":"04-structs","number":"04","title":"Module 04: Structs","html":`<h2>The C Concept</h2><p>A struct is a collection of variables (fields) grouped under one name. In C, structs have a fixed memory layout: fields are laid out in order, with padding between them for alignment.</p><p>For example, this C struct:</p><pre><code class="language-c">struct Loose {
    char a;    // 1 byte
    int b;     // 4 bytes
    char c;    // 1 byte
};</code></pre><p>Actually takes 12 bytes, not 6, because of padding:</p><ul><li><code>a</code> at offset 0 (1 byte)</li><li>3 bytes of padding (for <code>b</code> alignment)</li><li><code>b</code> at offset 4 (4 bytes)</li><li><code>c</code> at offset 8 (1 byte)</li><li>3 bytes of padding (for struct alignment)</li></ul><p>Reordering fields can save memory:</p><pre><code class="language-c">struct Tight {
    int b;     // 4 bytes
    char a;    // 1 byte
    char c;    // 1 byte
};</code></pre><p>This takes only 8 bytes.</p><h2>What You'll See</h2><ul><li>Defining structs with <code>floorplan</code></li><li>Visualizing padding with <code>layout()</code></li><li>Field ordering and its impact on size</li><li>Self-referencing structs (linked list nodes)</li></ul><h2>Functions</h2><p>Exercise 04 asks you to write one, so here is the syntax. <code>fn</code>, a name, parameters without types, and <code>return</code>:</p><pre><code>fn count_nodes(head) {
    n = 0
    cur = head
    while cur != none {
        n = n + 1
        cur = cur.next
    }
    return n
}

print(f"length: {count_nodes(n1)}")</code></pre><h3>One trap worth knowing now</h3><p>Parameters are local, but <strong>any other variable you assign inside a function is global</strong>. In <code>count_nodes</code> above, <code>head</code> is safely local (reassigning it does not touch the caller), but <code>n</code> and <code>cur</code> are not:</p><pre><code>n = 5
print(f"before: {n}")      // 5
count_nodes(n1)            // assigns n = 0 internally
print(f"after: {n}")       // 0, not 5</code></pre><p>So a helper that uses <code>i</code> or <code>n</code> will quietly overwrite an <code>i</code> or <code>n</code> in the code that called it. If a value changes for no visible reason after a function call, this is why. Give outer variables distinct names; Module 06 calls its length <code>need</code> for exactly this reason.</p><p>C does not behave this way; locals are local. This is a crunch-c wrinkle, not a lesson about C.</p><p>C would make you write the types (<code>int count_nodes(struct Node *head)</code>) and declare the function before anything calls it. crunch-c skips both. What carries over is the part that matters here: <code>head</code> is a <strong>copy</strong> of the pine you passed in. Walking <code>cur</code> forward inside the function does not move the caller's <code>n1</code>, because the pointer was copied even though the block it points at was not. That distinction is the whole of pass-by-value in C, and it is the reason C can hand a function access to a structure without handing over the variable holding its address.</p>`,"count":4},{"slug":"05-advanced","number":"05","title":"Module 05: Advanced","html":`<h2>The C Concept</h2><p>Three ideas that only make sense once Modules 01–04 are behind you. Each one is the same underlying fact wearing a different hat: memory is bytes, and a <strong>type</strong> is a decision about how to read them.</p><h3>Casting</h3><p>A cast tells the compiler to read a value as a different type. In C:</p><pre><code class="language-c">int  x = 300;
char c = (char)x;    // keep the low 8 bits, discard the rest
float f = (float)x;  // convert the numeric value</code></pre><p>Those two lines do genuinely different things. <code>(char)x</code> reinterprets: it throws bytes away and keeps a bit pattern. <code>(float)x</code> converts: it computes a new representation of the same number. C spells both with the same syntax, which is a large part of why cast bugs are so common. The classic is <code>(unsigned)-1</code>, which is not an error and not zero but the largest unsigned value there is; the bits never moved, only the rule for reading them.</p><p>crunch-c writes this as <code>osmosis(value, type)</code>, and makes you write it. There is no implicit promotion here, so a conversion you did not ask for cannot happen silently.</p><h3>Fixed-size arrays</h3><p>In C an array inside a struct is not a pointer to elements stored elsewhere: it <strong>is</strong> the elements, laid out inline:</p><pre><code class="language-c">struct Buffer {
    int data[4];   // 16 bytes, right here
    int length;    // at offset 16
};</code></pre><p>There is no length stored anywhere, and no bounds check. <code>data[i]</code> means "the address of <code>data</code>, plus <code>i</code> times four bytes" and nothing more. Which is why <code>data[7]</code> is not an error in C: it is a perfectly well-formed instruction to read memory that belongs to <code>length</code>, or to whatever sits past the end of the struct.</p><p>Exercise 02 makes you do that arithmetic by hand, so the indexing syntax stops being an abstraction.</p><h3>Binary protocols</h3><p>Every network packet and file format is a struct someone agreed on in advance. Parsing one means laying a floorplan over raw bytes and reading fields out at known offsets, which is exactly what Module 04 was about, applied to bytes you did not write yourself.</p><p>Two things bite here, and both are already familiar: <strong>endianness</strong> (the byte order from Module 02: a <code>u16</code> magic number of <code>0x4D47</code> sits in memory as <code>47 4D</code> on a little-endian machine) and <strong>padding</strong> (the alignment rules from Module 04: a header that reads like 8 bytes of fields may occupy 12, and a parser that assumed 8 will misread every field after the gap).</p><p>The header in Exercise 03 is genuinely 8 bytes with no padding at all, but not by accident: <code>u16, u8, u8, u32</code> happens to fill each alignment boundary exactly as it goes. Run <code>layout()</code> on it and confirm that before you trust it. Then try reordering the fields and watch a wire format that no longer matches the wire.</p><p>Real C code fights this with <code>#pragma pack</code> or by reading fields one at a time. The bug it prevents is the kind that only appears on the other machine.</p><h2>What You'll See</h2><ul><li>Explicit conversion with <code>osmosis()</code>, and truncation as bit-discarding</li><li>Two's complement: why <code>-1</code> cast to unsigned is the maximum value</li><li>Array fields in a <code>floorplan</code>, indexed by hand</li><li>What an out-of-bounds index does when it lands <strong>inside</strong> the same block</li><li>Laying a header over bytes and reading it back with <code>bathysphere()</code></li></ul>`,"count":3},{"slug":"06-strings","number":"06","title":"Module 06: Strings","html":`<h2>The C Concept</h2><p>C has no string type. It has a convention.</p><p>A "string" in C is a block of bytes that happens to end with a zero. That zero (the NUL terminator, written <code>'\\0'</code>) is not a length, not a header, and not stored anywhere separate. It is one byte of value 0 sitting in the data, and every function that touches a string finds the end by walking forward until it hits one.</p><pre><code class="language-c">char name[6] = "hello";   // 5 letters and a terminator: 6 bytes, not 5</code></pre><p>Everything follows from that:</p><ul><li><strong><code>strlen</code> is a loop, not a lookup.</strong> It walks until it finds the zero, so it costs time proportional to the length, and it has no idea how big the buffer actually is.</li><li><strong>A missing terminator is not a short string. It is an unbounded read.</strong> <code>strlen</code> keeps walking into whatever comes next until it happens to find a zero byte or the program dies.</li><li><strong>Every buffer needs one more byte than its text.</strong> The <code>+ 1</code> that C programmers write everywhere is room for the terminator, and forgetting it is the single most common bug in the language.</li></ul><p>This is where C's memory model stops being an abstract concern. Unterminated strings and undersized buffers are the mechanism behind a large share of the security vulnerabilities of the last thirty years.</p><h2>Writing Text By Hand</h2><p>crunch-c has no character literals, so you write bytes as decimal ASCII codes. This is tedious on purpose: it keeps the fact that a string <strong>is just bytes</strong> impossible to forget. Keep your words short.</p><pre><code> space 32      0-9  48-57
 A-Z   65-90   a-z  97-122</code></pre><p>So <code>A</code> is 65, <code>H</code> is 72, and the terminator is plain <code>0</code>.</p><p><code>bathysphere()</code> prints the ASCII alongside the hex, which is where this pays off: you write <code>72 73 0</code> and the dump shows you <code>|HI.|</code>.</p><h2>What You'll See</h2><ul><li>A string as a <code>u8</code> block ending in zero</li><li>Writing <code>strlen</code> as a <code>while</code> loop over bytes</li><li>What an unterminated string does to that loop</li><li><code>sizeof</code> vs <code>strlen</code>, and where the <code>+ 1</code> comes from</li><li>A copy that overruns its buffer and silently rewrites the field next door</li></ul>`,"count":4}];export const LESSONS=[{"module":"01-types","moduleTitle":"Module 01: Types","number":"01","slug":"01-widths","title":"Fixed-Width Integers","introHtml":"<p>In C, integers come in fixed sizes:</p><pre><code>uint8_t  = 8 bits, unsigned, range 0 to 255\nint32_t  = 32 bits, signed, range roughly -2 billion to +2 billion\nuint64_t = 64 bits, unsigned, very large range</code></pre><p>In crunch-c, these are: u8, i32, u64, etc. Let's see how they behave.</p>","tasksHtml":"<ol><li>Uncomment the u8(256) line. What error do you see?</li><li>Uncomment the i8(200) line. What error do you see?</li><li>Create a u16 variable, assign it 65535 (its max), and print it.</li><li>Create an i64 variable and give it 9999999999 - a number far too big for any 32-bit type. Print it.</li><li>Now put that same 9999999999 into an i32 and print it. It does not fit. Before you run it: what do you expect to come out?</li></ol><p>Write your answers below this line.</p>","bonusHtml":"","code":`// Module 01, Exercise 01: Fixed-Width Integers
//
// In C, integers come in fixed sizes:
//   uint8_t  = 8 bits, unsigned, range 0 to 255
//   int32_t  = 32 bits, signed, range roughly -2 billion to +2 billion
//   uint64_t = 64 bits, unsigned, very large range
//
// In crunch-c, these are: u8, i32, u64, etc.
// Let's see how they behave.

// A u8 can hold 0 to 255.
big = u8(255)
print(f"u8 max: {big}")

// What happens if we try to go higher?
// Uncomment the next line and run this file:
// big = u8(256)

// A signed i32 can hold negative numbers.
temp = i32(-42)
print(f"i32 negative: {temp}")

// An i8 can only hold -128 to 127.
small = i8(100)
print(f"i8 value: {small}")

// Uncomment to see what happens when i8 exceeds its range:
// small = i8(200)

// YOUR TASK:
// 1. Uncomment the u8(256) line. What error do you see?
// 2. Uncomment the i8(200) line. What error do you see?
// 3. Create a u16 variable, assign it 65535 (its max), and print it.
// 4. Create an i64 variable and give it 9999999999 - a number far too big
//    for any 32-bit type. Print it.
// 5. Now put that same 9999999999 into an i32 and print it. It does not
//    fit. Before you run it: what do you expect to come out?
//
// Write your answers below this line.
`,"solution":'// Solution to Module 01, Exercise 01: Fixed-Width Integers\n//\n// Task 1 & 2 are about what happens when a literal does not fit.\n// Note the wording in the exercise: these are *warnings*, not errors.\n// crunch-c wraps the value the way C does and tells you it did.\n//\n//   u8(256)  -> spooked: u8(): 256 does not fit u8 [0, 255] - wrapped to 0\n//   i8(200)  -> spooked: i8(): 200 does not fit i8 [-128, 127] - wrapped to -56\n//\n// 200 wraps to -56 because 200 - 256 = -56: the bit pattern 0b11001000 read\n// as a signed byte is negative. The bits never changed, only how we read them.\n\n// Task 1: a u8 literal that overflows.\nover_u8 = u8(256)\nprint(f"u8(256) wrapped to: {over_u8}")\n\n// Task 2: a signed i8 literal that overflows.\nover_i8 = i8(200)\nprint(f"i8(200) wrapped to: {over_i8}")\n\n// Task 3: a u16 at its maximum.\nmax_u16 = u16(65535)\nprint(f"u16 max: {max_u16}")\n\n// Task 4: an i64 holding a number no 32-bit type could.\nlarge = i64(9999999999)\nprint(f"i64 large: {large}")\n\n// Task 5: the same number does not fit an i32, whose range stops just above\n// 2.1 billion. It wraps rather than saturating - you do not get "the biggest\n// i32", you get whatever the low 32 bits happen to spell, read as signed.\n// Guessing this one correctly in advance is hard, and that is the point: a\n// value that overflowed is not a value you can reason about from the\n// original number.\ntoo_big = i32(9999999999)\nprint(f"i32(9999999999) wrapped to: {too_big}")\n'},{"module":"01-types","moduleTitle":"Module 01: Types","number":"02","slug":"02-overflow","title":"Overflow and Wrapping","introHtml":"<p>In C, when an unsigned integer exceeds its maximum value, it wraps around to zero. This is defined behavior for unsigned types, but it's still a common source of bugs.</p><p>In crunch-c, the wrap happens AND you get a warning.</p>","tasksHtml":"<ol><li>Run this file. What warning do you see?</li><li>What happens when you add 1 to u8(255)?</li><li>Create a loop that counts from u8(250) to u8(260). How many times does the spooked warning fire?</li></ol>","bonusHtml":"<p>Signed overflow In C, signed integer overflow is undefined behavior. In crunch-c, it wraps and warns.</p>","code":`// Module 01, Exercise 02: Overflow and Wrapping
//
// In C, when an unsigned integer exceeds its maximum value,
// it wraps around to zero. This is defined behavior for unsigned types,
// but it's still a common source of bugs.
//
// In crunch-c, the wrap happens AND you get a warning.

// A u8 wraps from 255 to 0.
counter = u8(254)
print(f"start: {counter}")

counter = counter + u8(1)
print(f"after +1: {counter}")  // What do you expect?

counter = counter + u8(1)
print(f"after +1 again: {counter}")

// YOUR TASK:
// 1. Run this file. What warning do you see?
// 2. What happens when you add 1 to u8(255)?
// 3. Create a loop that counts from u8(250) to u8(260).
//    How many times does the spooked warning fire?

// BONUS: Signed overflow
// In C, signed integer overflow is undefined behavior.
// In crunch-c, it wraps and warns.
neg = i8(-128)
print(f"i8 min: {neg}")

neg = neg - i8(1)
print(f"after -1: {neg}")  // What happens here?
`,"solution":'// Solution to Module 01, Exercise 02: Overflow and Wrapping\n//\n// Task 1: the warning is\n//   spooked at line N: u8 overflow: 255 + 1 = 256, wrapped to 0 (range [0, 255])\n//\n// Task 2: u8(255) + u8(1) is 0. The arithmetic is done, the result does not\n// fit in eight bits, and the high bit falls off the end. In C this is defined\n// behaviour for unsigned types, which is exactly why it is dangerous: the\n// compiler is allowed to assume you meant it.\n\ncounter = u8(254)\nprint(f"start: {counter}")\n\ncounter = counter + u8(1)\nprint(f"after +1: {counter}")\n\ncounter = counter + u8(1)\nprint(f"after +1 again: {counter}")\n\n// Task 3: count from 250 up through 260.\n//\n// The loop runs ten times, but the warning fires exactly ONCE: on the single\n// step that crosses 255. Every other step is an ordinary addition. This is the\n// point of the exercise: a wrap is a one-instant event, easy to miss in a log,\n// and afterwards the counter looks perfectly reasonable again.\nprint("")\nprint("counting u8 from 250, ten times:")\n\nc = u8(250)\ni = 0\nwhile i < 10 {\n    c = c + u8(1)\n    print(f"  step {i + 1}: {c}")\n    i = i + 1\n}\nprint(f"final value: {c}")\n\n// 250 + 10 = 260, and 260 - 256 = 4. The counter ends at 4, not 260.\n\n// BONUS: signed overflow.\n//\n// In C, signed overflow is *undefined* behaviour, not merely wrapping: the\n// compiler may assume it never happens and optimise on that basis. crunch-c\n// wraps and warns so you can see the shape of the bug.\nprint("")\nneg = i8(-128)\nprint(f"i8 min: {neg}")\n\nneg = neg - i8(1)\nprint(f"after -1: {neg}")\n\n// -128 - 1 wraps to 127: the lowest value becomes the highest.\n'},{"module":"01-types","moduleTitle":"Module 01: Types","number":"03","slug":"03-division","title":"Truncating Division","introHtml":"<p>In C, integer division truncates toward zero:</p><pre><code>7 / 2 = 3   (not 3.5)\n7 / 2 = -3  (not -4)</code></pre><p>Python floors toward negative infinity:</p><pre><code>7 // 2 = -4</code></pre><p>crunch-c follows C: division truncates toward zero.</p>","tasksHtml":"<ol><li>What is -7 / 2 in crunch-c? (Hint: it's not -4)</li><li>What is 10 / 3?</li><li>What is -10 / 3?</li><li>Create two i32 variables and divide them. Check the result matches C behavior, not Python.</li></ol>","bonusHtml":"","code":`// Module 01, Exercise 03: Truncating Division
//
// In C, integer division truncates toward zero:
//   7 / 2 = 3   (not 3.5)
//  -7 / 2 = -3  (not -4)
//
// Python floors toward negative infinity:
//  -7 // 2 = -4
//
// crunch-c follows C: division truncates toward zero.

// Positive division
print(f"7 / 2 = {i32(7) / i32(2)}")

// Negative division
print(f"-7 / 2 = {i32(-7) / i32(2)}")

// YOUR TASK:
// 1. What is -7 / 2 in crunch-c? (Hint: it's not -4)
// 2. What is 10 / 3?
// 3. What is -10 / 3?
// 4. Create two i32 variables and divide them.
//    Check the result matches C behavior, not Python.

a = i32(10)
b = i32(3)
print(f"{a} / {b} = {a / b}")

c = i32(-10)
d = i32(3)
print(f"{c} / {d} = {c / d}")
`,"solution":`// Solution to Module 01, Exercise 03: Truncating Division
//
// Task 1: -7 / 2 is -3, not -4.
// Task 2: 10 / 3 is 3.
// Task 3: -10 / 3 is -3.
//
// The rule is "truncate toward zero": throw away the fractional part and
// keep the sign. Python's // floors toward negative infinity instead, so it
// answers -4 and -4. Same numbers, different direction, and the two agree
// on every positive case, which is what makes the disagreement easy to miss.

print(f"7 / 2 = {i32(7) / i32(2)}")
print(f"-7 / 2 = {i32(-7) / i32(2)}")

// Task 4: divide two i32 variables and check against C, not Python.
a = i32(10)
b = i32(3)
print(f"{a} / {b} = {a / b}")

c = i32(-10)
d = i32(3)
print(f"{c} / {d} = {c / d}")

// The pairs below make the direction visible. Truncation is symmetric about
// zero: the negative answer is the negation of the positive one. Flooring is
// not: it would give -4 on the left of each pair while C gives -3.
print("")
print("truncation is symmetric about zero:")
print(f"   7 / 2 = {i32(7) / i32(2)}     -7 / 2 = {i32(-7) / i32(2)}")
print(f"  10 / 3 = {i32(10) / i32(3)}    -10 / 3 = {i32(-10) / i32(3)}")
print(f"   9 / 4 = {i32(9) / i32(4)}     -9 / 4 = {i32(-9) / i32(4)}")
`},{"module":"02-pointers","moduleTitle":"Module 02: Pointers","number":"01","slug":"01-garrison","title":"Allocating Memory","introHtml":'<p>In C, you allocate memory with malloc():</p><pre><code>int *p = malloc(sizeof(int));</code></pre><p>In crunch-c, you allocate with garrison():</p><pre><code>p = garrison(4)    // 4 bytes, enough for an i32</code></pre><p>garrison returns a "pine": a pointer to the allocated block.</p>',"tasksHtml":"<ol><li>Run this file. What does it print?</li><li>Allocate 8 bytes. What could that hold?</li><li>Allocate 1 byte. What can you store in 1 byte?</li></ol>","bonusHtml":"","code":'// Module 02, Exercise 01: Allocating Memory\n//\n// In C, you allocate memory with malloc():\n//   int *p = malloc(sizeof(int));\n//\n// In crunch-c, you allocate with garrison():\n//   p = garrison(4)    // 4 bytes, enough for an i32\n//\n// garrison returns a "pine": a pointer to the allocated block.\n\n// Allocate 4 bytes (enough for one i32).\np = garrison(4)\nprint(f"allocated 4 bytes at some address")\n\n// Allocate 16 bytes (enough for 4 i32s).\narr = garrison(16)\nprint(f"allocated 16 bytes")\n\n// YOUR TASK:\n// 1. Run this file. What does it print?\n// 2. Allocate 8 bytes. What could that hold?\n// 3. Allocate 1 byte. What can you store in 1 byte?\n\n// HINT: The .arena command in the REPL shows all allocated blocks.\n// Try running this in the REPL and typing .arena after execution.\n',"solution":'// Solution to Module 02, Exercise 01: Allocating Memory\n//\n// Task 1: the file prints its two messages. garrison() hands back a pine, but\n// nothing here reads or writes through it yet, so there is nothing else to see.\n//\n// Task 2: 8 bytes holds one i64 or one f64, or two i32s, or eight u8s. Size is\n// all the arena knows: a block has no type until you peek or poke one.\n//\n// Task 3: 1 byte holds a u8 (0..255) or an i8 (-128..127). One byte, two very\n// different ranges, depending only on how you choose to read it.\n\np = garrison(4)\nprint("allocated 4 bytes, room for one i32")\n\narr = garrison(16)\nprint("allocated 16 bytes, room for four i32s")\n\neight = garrison(8)\nprint("allocated 8 bytes: one i64, or two i32s, or eight u8s")\n\none = garrison(1)\nprint("allocated 1 byte: a u8 or an i8")\n\n// The same eight bytes, read two ways. Nothing about the block changed\n// between these two lines; only the type we handed to peek did.\neight.poke(i64, i64(1))\nprint("")\nprint(f"as one i64:  {eight.peek(i64)}")\nprint(f"as an i32 at offset 0: {eight.peek(i32)}")\nprint(f"as an i32 at offset 4: {(eight + 4).peek(i32)}")\n\n// Free everything. Leave any of these out and the run ends with an\n// "ancient weeds" warning naming the line that allocated it, which is\n// exactly what Module 03 Exercise 04 is about.\nscorch(p)\nscorch(arr)\nscorch(eight)\nscorch(one)\nprint("")\nprint("all four blocks scorched: no ancient weeds")\n'},{"module":"02-pointers","moduleTitle":"Module 02: Pointers","number":"02","slug":"02-peek-poke","title":"Reading and Writing Memory","introHtml":"<p>In C, you dereference a pointer to read/write:</p><pre><code>*p = 42;        // write\nint val = *p;   // read</code></pre><p>In crunch-c:</p><pre><code>p.poke(i32, 42)   // write an i32\nval = p.peek(i32) // read an i32</code></pre><p>You can also access individual bytes with p[i].</p>","tasksHtml":"<ol><li>What is the first byte of the i32 value 42?</li><li>Write i32(1000) and read back the first two bytes. What values do you get? (Hint: think about endianness)</li><li>Allocate 8 bytes, write two i32 values, and read them back.</li></ol>","bonusHtml":"","code":'// Module 02, Exercise 02: Reading and Writing Memory\n//\n// In C, you dereference a pointer to read/write:\n//   *p = 42;        // write\n//   int val = *p;   // read\n//\n// In crunch-c:\n//   p.poke(i32, 42)   // write an i32\n//   val = p.peek(i32) // read an i32\n//\n// You can also access individual bytes with p[i].\n\n// Allocate 4 bytes and write an i32 to it.\np = garrison(4)\np.poke(i32, 42)\nprint(f"wrote 42")\n\n// Read it back.\nval = p.peek(i32)\nprint(f"read: {val}")\n\n// Write a different value.\np.poke(i32, 999)\nval = p.peek(i32)\nprint(f"read again: {val}")\n\n// Byte access: read individual bytes.\nbyte_val = p[0]\nprint(f"first byte: {byte_val}")\n\n// YOUR TASK:\n// 1. What is the first byte of the i32 value 42?\n// 2. Write i32(1000) and read back the first two bytes.\n//    What values do you get? (Hint: think about endianness)\n// 3. Allocate 8 bytes, write two i32 values, and read them back.\n',"solution":'// Solution to Module 02, Exercise 02: Reading and Writing Memory\n//\n// Task 1: the first byte of i32(42) is 42. 42 fits in one byte, and on a\n// little-endian machine the least significant byte comes first, so the whole\n// value sits in byte 0 and bytes 1-3 are zero.\n//\n// Task 2: i32(1000) gives first byte 232, second byte 3.\n// 1000 is 0x3E8. Little-endian stores it low byte first: E8 03 00 00.\n// 0xE8 is 232 and 0x03 is 3, so 232 + 3 * 256 = 1000.\n\np = garrison(4)\np.poke(i32, 42)\nprint(f"wrote 42, read back: {p.peek(i32)}")\nprint(f"first byte of 42: {p[0]}")\n\np.poke(i32, 1000)\nprint("")\nprint(f"wrote 1000, read back: {p.peek(i32)}")\nprint(f"byte 0: {p[0]}   byte 1: {p[1]}   byte 2: {p[2]}   byte 3: {p[3]}")\nprint("1000 = 0x3E8, stored low byte first: E8 03 00 00")\n\n// bathysphere shows the same bytes laid out as a hex dump.\nbathysphere(p)\n\n// Task 3: eight bytes holding two i32s side by side.\nprint("")\npair = garrison(8)\npair.poke(i32, 111)\n(pair + 4).poke(i32, 222)\nprint(f"first i32 (offset 0): {pair.peek(i32)}")\nprint(f"second i32 (offset 4): {(pair + 4).peek(i32)}")\nbathysphere(pair)\n\nscorch(p)\nscorch(pair)\n'},{"module":"02-pointers","moduleTitle":"Module 02: Pointers","number":"03","slug":"03-pine-arithmetic","title":"Pointer Arithmetic","introHtml":"<p>In C, you can add to a pointer to move it forward:</p><pre><code>p + 1  moves forward by sizeof(type) bytes</code></pre><p>In crunch-c, pine arithmetic moves by 1 byte:</p><pre><code>p + 1  moves forward by 1 byte</code></pre><p>This is like char* arithmetic in C.</p>","tasksHtml":"<ol><li>Allocate 12 bytes.</li><li>Write three i32 values at offsets 0, 4, and 8.</li><li>Read them back using pointer arithmetic.</li><li>What happens if you try to read at offset 10? (Hint: that's in the middle of an i32)</li></ol>","bonusHtml":"<p>Iterate through an array</p>","code":`// Module 02, Exercise 03: Pointer Arithmetic
//
// In C, you can add to a pointer to move it forward:
//   p + 1  moves forward by sizeof(type) bytes
//
// In crunch-c, pine arithmetic moves by 1 byte:
//   p + 1  moves forward by 1 byte
//
// This is like char* arithmetic in C.

// Allocate 8 bytes.
p = garrison(8)

// Write values at different offsets.
p.poke(i32, 100)      // bytes 0-3
(p + 4).poke(i32, 200) // bytes 4-7

// Read from shifted positions.
val1 = p.peek(i32)
val2 = (p + 4).peek(i32)
print(f"offset 0: {val1}")
print(f"offset 4: {val2}")

// YOUR TASK:
// 1. Allocate 12 bytes.
// 2. Write three i32 values at offsets 0, 4, and 8.
// 3. Read them back using pointer arithmetic.
// 4. What happens if you try to read at offset 10?
//    (Hint: that's in the middle of an i32)

// BONUS: Iterate through an array
arr = garrison(16)
// Write 4 i32 values: 10, 20, 30, 40
i = 0
while i < 4 {
    (arr + i * 4).poke(i32, (i + 1) * 10)
    i = i + 1
}

// Read them back
i = 0
while i < 4 {
    val = (arr + i * 4).peek(i32)
    print(f"arr[{i}] = {val}")
    i = i + 1
}
`,"solution":`// Solution to Module 02, Exercise 03: Pointer Arithmetic
//
// Tasks 1-3: allocate 12 bytes, write three i32s at offsets 0, 4 and 8, and
// read them back. Because pine arithmetic moves one byte at a time (like
// char* in C, not int*), stepping to the next i32 means adding 4, not 1.

p = garrison(12)

p.poke(i32, 100)
(p + 4).poke(i32, 200)
(p + 8).poke(i32, 300)

print(f"offset 0: {p.peek(i32)}")
print(f"offset 4: {(p + 4).peek(i32)}")
print(f"offset 8: {(p + 8).peek(i32)}")
bathysphere(p)

// BONUS: walk the same block with a loop, computing each offset as i * 4.
print("")
arr = garrison(16)
i = 0
while i < 4 {
    (arr + i * 4).poke(i32, (i + 1) * 10)
    i = i + 1
}

i = 0
while i < 4 {
    print(f"arr[{i}] = {(arr + i * 4).peek(i32)}")
    i = i + 1
}

scorch(arr)

// Task 4: reading an i32 at offset 10 of a 12-byte block.
//
// An i32 is four bytes, so offset 10 asks for bytes 10, 11, 12 and 13. The
// block only covers 0..11. Two of those bytes are past the end, so this is
// out of bounds and the run stops here:
//
//   area does not exist at line N, column M
//   byte 10..13 is outside this pine's block, which covers 0..11
//     (12 bytes garrisoned at line 7)
//
// Note what this is NOT. The read is not rejected for being misaligned:
// offset 10 is not a multiple of 4, and C would call that undefined too, but
// that is not the complaint here. It is rejected for running off the end.
// Offsets 0 and 4 fit; 8 fits exactly, ending on the last byte; 10 does not.
//
// In C this read would quietly succeed, handing you two bytes of your data
// and two bytes of whatever the allocator put next door.
//
// This is the last statement in the file because it ends the program.
print("")
print("now reading an i32 at offset 10 of a 12-byte block...")
val = (p + 10).peek(i32)
print(f"unreachable: {val}")
`},{"module":"02-pointers","moduleTitle":"Module 02: Pointers","number":"04","slug":"04-scorch","title":"Freeing Memory","introHtml":'<p>In C, you free memory with free():</p><pre><code>free(p);</code></pre><p>After freeing, using the pointer is undefined behavior. In crunch-c, you free with scorch():</p><pre><code>scorch(p)</code></pre><p>After scorching, the block is marked as freed. Any attempt to read or write it triggers "quicksand."</p>',"tasksHtml":"<ol><li>Run this file. What happens?</li><li>Uncomment the line below. What error do you see?</li></ol><pre><code>val = p.peek(i32)</code></pre>","bonusHtml":`<p>What about double-free? Uncomment these lines to see what happens:</p><pre><code>scorch(p)
scorch(p)</code></pre><p>Leak detection Allocate memory and DON'T scorch it. Run this file and look for "ancient weeds" warnings. That's the arena telling you about memory you forgot to free.</p>`,"code":`// Module 02, Exercise 04: Freeing Memory
//
// In C, you free memory with free():
//   free(p);
//
// After freeing, using the pointer is undefined behavior.
// In crunch-c, you free with scorch():
//   scorch(p)
//
// After scorching, the block is marked as freed.
// Any attempt to read or write it triggers "quicksand."

// Allocate and use memory.
p = garrison(4)
p.poke(i32, 42)
print(f"before scorch: {p.peek(i32)}")

// Free the memory.
scorch(p)
print(f"after scorch")

// YOUR TASK:
// 1. Run this file. What happens?
// 2. Uncomment the line below. What error do you see?
// val = p.peek(i32)

// This is use-after-free: one of the most dangerous bugs in C.
// In crunch-c, it's caught with "quicksand" instead of crashing.

// BONUS: What about double-free?
// Uncomment these lines to see what happens:
// scorch(p)
// scorch(p)

// BONUS: Leak detection
// Allocate memory and DON'T scorch it.
// Run this file and look for "ancient weeds" warnings.
// That's the arena telling you about memory you forgot to free.
`,"solution":'// Solution to Module 02, Exercise 04: Freeing Memory\n//\n// Task 1: as shipped the file runs clean. It writes 42, reads it back, then\n// scorches the block. Nothing touches the block after that, so nothing is\n// wrong: this is the well-behaved version.\n//\n// Task 2: uncommenting the peek turns it into use-after-free:\n//\n//   quicksand at line N, column M\n//   this ground was scorched at line 12 (garrisoned at line 10)\n//\n// The message names both moments: where the block was freed and where it was\n// allocated. In C you would get neither. You would get whatever bytes happen\n// to be at that address now, which is often the old value, which is why this\n// bug survives testing and fails in production.\n//\n// BONUS (double-free): calling scorch(p) twice reports quicksand as well, and\n// names the first scorch. See 03-faults/03-double-free for that one.\n//\n// BONUS (leak): skipping scorch entirely ends the run with\n//   spooked: ancient weeds - 1 pine never scorched (4 bytes), garrisoned at line N\n// See 03-faults/04-leaks.\n\np = garrison(4)\np.poke(i32, 42)\nprint(f"before scorch: {p.peek(i32)}")\n\nscorch(p)\nprint("after scorch: the block is gone, and p still points at where it was")\n\n// A pine does not become none when you scorch it. It keeps the same address;\n// only the ground under it changed. That is precisely why C cannot warn you:\n// the pointer looks exactly as valid as it did a line earlier.\n\n// Reading through it now is use-after-free. This ends the program, so it is\n// the last statement in the file.\nprint("")\nprint("now reading through the scorched pine...")\nval = p.peek(i32)\nprint(f"unreachable: {val}")\n'},{"module":"03-faults","moduleTitle":"Module 03: Memory Faults","number":"01","slug":"01-quicksand","title":"Use-After-Free (Quicksand)","introHtml":`<p>In C, using a pointer after freeing it is undefined behavior. The memory might still contain old data, or it might be reused. This is called "use-after-free" and is a common security vulnerability.</p><p>In crunch-c, it's called "quicksand": you're standing on ground that isn't there anymore.</p>`,"tasksHtml":"<ol><li>Uncomment the line above. What error do you see?</li><li>The error message should tell you WHERE the block was scorched. What line number does it reference?</li><li>Try writing to freed memory (poke). Is the error the same?</li></ol>","bonusHtml":"","code":`// Module 03, Exercise 01: Use-After-Free (Quicksand)
//
// In C, using a pointer after freeing it is undefined behavior.
// The memory might still contain old data, or it might be reused.
// This is called "use-after-free" and is a common security vulnerability.
//
// In crunch-c, it's called "quicksand": you're standing on ground
// that isn't there anymore.

// Allocate and free memory.
p = garrison(4)
p.poke(i32, 42)
scorch(p)

// Now try to read the freed memory.
// Uncomment the next line:
// val = p.peek(i32)

// YOUR TASK:
// 1. Uncomment the line above. What error do you see?
// 2. The error message should tell you WHERE the block was scorched.
//    What line number does it reference?
// 3. Try writing to freed memory (poke). Is the error the same?

// In C, this would silently read garbage data or crash.
// In crunch-c, you get a clear error with source location.
`,"solution":`// Solution to Module 03, Exercise 01: Use-After-Free (Quicksand)
//
// Task 1: uncommenting the peek gives
//
//   quicksand at line N, column M
//     |
//   N | val = p.peek(i32)
//     |         ^
//   this ground was scorched at line 12 (garrisoned at line 10)
//
// Task 2: the message names the scorch line, and the garrison line too, so
// you get the block's whole story: where it came from, where it died, and
// where you touched it afterwards. Three locations, one message.
//
// Task 3: writing to freed memory is the same fault. poke reports quicksand
// exactly as peek does. Reading freed memory leaks stale data; writing it
// corrupts whatever now lives at that address. C distinguishes them only in
// how badly they end.

p = garrison(4)
p.poke(i32, 42)
print(f"while alive: {p.peek(i32)}")
scorch(p)
print("scorched")

// Task 3 demonstrated: poke through a scorched pine. Swap the two statements
// below to see the read version: the message is identical apart from the
// column, because the fault is about the ground, not the direction of travel.
print("")
print("now writing through the scorched pine...")
p.poke(i32, 99)
print("unreachable")
`},{"module":"03-faults","moduleTitle":"Module 03: Memory Faults","number":"02","slug":"02-out-of-bounds","title":"Out-of-Bounds (Area Does Not Exist)","introHtml":`<p>In C, reading past the end of an array is undefined behavior. You might read garbage, or you might crash. The compiler assumes it never happens.</p><p>In crunch-c, it's called "area does not exist": you're trying to access memory that isn't part of your allocation.</p>`,"tasksHtml":"<ol><li>Uncomment the line above. What error do you see?</li><li>The error should show the block's extent. What is it?</li><li>What happens if you try p[100]?</li><li>Allocate 8 bytes. What's the last valid byte index?</li></ol>","bonusHtml":"<p>In C, this is how buffer overflows happen. Attackers exploit out-of-bounds reads to leak data, and out-of-bounds writes to overwrite other memory.</p>","code":`// Module 03, Exercise 02: Out-of-Bounds (Area Does Not Exist)
//
// In C, reading past the end of an array is undefined behavior.
// You might read garbage, or you might crash. The compiler assumes
// it never happens.
//
// In crunch-c, it's called "area does not exist": you're trying
// to access memory that isn't part of your allocation.

// Allocate 4 bytes (enough for one i32).
p = garrison(4)
p.poke(i32, 42)

// Read within bounds: this works.
val = p.peek(i32)
print(f"within bounds: {val}")

// Read one byte past the end: this is out of bounds.
// Uncomment the next line:
// val = p[4]

// YOUR TASK:
// 1. Uncomment the line above. What error do you see?
// 2. The error should show the block's extent. What is it?
// 3. What happens if you try p[100]?
// 4. Allocate 8 bytes. What's the last valid byte index?

// BONUS: In C, this is how buffer overflows happen.
// Attackers exploit out-of-bounds reads to leak data,
// and out-of-bounds writes to overwrite other memory.
`,"solution":`// Solution to Module 03, Exercise 02: Out-of-Bounds (Area Does Not Exist)
//
// Task 1: reading p[4] on a 4-byte block gives
//
//   area does not exist at line N, column M
//   byte 4..4 is outside this pine's block, which covers 0..3
//     (4 bytes garrisoned at line 11)
//
// Task 2: the extent is spelled out: "covers 0..3". Four bytes, indices 0
// through 3. Index 4 is the first one past the end, and it is the classic
// off-by-one: the count and the last index are never the same number.
//
// Task 3: p[100] reports the same fault, "byte 100..100 is outside". The
// distance does not matter. One byte past the end and ninety-seven bytes past
// the end are the same kind of wrong, and crunch-c refuses both identically.
// In C they are worlds apart in practice: p[4] usually lands in the
// allocator's own bookkeeping and quietly corrupts it, while p[100] is more
// likely to hit an unmapped page and actually crash. The bug that crashes is
// the lucky one.
//
// Task 4: on an 8-byte block the last valid index is 7.

p = garrison(4)
p.poke(i32, 42)
print(f"within bounds: {p.peek(i32)}")

// Task 4 demonstrated: walk an 8-byte block to its real last index.
eight = garrison(8)
print("")
print("8 bytes; valid indices are 0..7:")
i = 0
while i < 8 {
    print(f"  byte {i}: {eight[i]}")
    i = i + 1
}
print("index 8 would be the first one past the end")
scorch(eight)

// BONUS: this is the shape of every buffer overflow. An out-of-bounds read
// leaks whatever sits next door; an out-of-bounds write overwrites it. Heap
// allocators keep their own metadata between blocks, so "next door" is often
// the bookkeeping that free() will later trust.

// Ends the program, so it goes last.
print("")
print("now reading one byte past the end of a 4-byte block...")
val = p[4]
print(f"unreachable: {val}")
`},{"module":"03-faults","moduleTitle":"Module 03: Memory Faults","number":"03","slug":"03-double-free","title":"Double-Free","introHtml":`<p>In C, freeing the same pointer twice is undefined behavior. The second free might corrupt the heap allocator's internal data.</p><p>In crunch-c, it's called "quicksand", the same as use-after-free. The error tells you about BOTH scorch locations.</p>`,"tasksHtml":"<ol><li>Uncomment the line above. What error do you see?</li><li>Does it tell you about the FIRST scorch too?</li><li>In C, double-free can cause crashes or security holes. In crunch-c, it's caught every time.</li></ol>","bonusHtml":"<p>What about triple-free? Uncomment these lines:</p><pre><code>scorch(p)\nscorch(p)\nscorch(p)</code></pre>","code":`// Module 03, Exercise 03: Double-Free
//
// In C, freeing the same pointer twice is undefined behavior.
// The second free might corrupt the heap allocator's internal data.
//
// In crunch-c, it's called "quicksand", the same as use-after-free.
// The error tells you about BOTH scorch locations.

// Allocate and free.
p = garrison(4)
p.poke(i32, 42)
scorch(p)

// Try to free again.
// Uncomment the next line:
// scorch(p)

// YOUR TASK:
// 1. Uncomment the line above. What error do you see?
// 2. Does it tell you about the FIRST scorch too?
// 3. In C, double-free can cause crashes or security holes.
//    In crunch-c, it's caught every time.

// BONUS: What about triple-free? Uncomment these lines:
// scorch(p)
// scorch(p)
// scorch(p)
`,"solution":`// Solution to Module 03, Exercise 03: Double-Free
//
// Task 1: the second scorch reports
//
//   quicksand at line N, column M
//   this ground was already scorched at line 27
//
// Note the wording differs from use-after-free, which says "this ground was
// scorched at line X (garrisoned at line Y)". Double-free says "already
// scorched": the arena is telling you the block was dead before you asked,
// not that you read through a dead pine.
//
// Task 2: yes; it names the FIRST scorch. That is the useful half. Finding
// the second free is easy, since it is the line that failed; finding the first
// one is the hard part, and it is often in a different function written by a
// different person on a different day.
//
// Task 3: caught every time, because the arena remembers each block's state
// rather than trusting the pointer. In C the allocator's free lists live in
// the freed memory itself, so a second free corrupts the structure that free()
// walks, which is why double-free is exploitable and not merely a crash.
//
// BONUS (triple-free): the third scorch reports exactly the same fault as the
// second, and still points at the first scorch. Once a block is dead, every
// later scorch is the same mistake made again; the arena does not count them.
// You never see the third one anyway: the run stops at the second.

p = garrison(4)
p.poke(i32, 42)
print(f"value: {p.peek(i32)}")

scorch(p)
print("first scorch: fine, this is the correct one")

// Ends the program, so it goes last.
print("")
print("now scorching the same pine a second time...")
scorch(p)
print("unreachable")
`},{"module":"03-faults","moduleTitle":"Module 03: Memory Faults","number":"04","slug":"04-leaks","title":"Memory Leaks (Ancient Weeds)","introHtml":'<p>In C, forgetting to free memory is a memory leak. The memory is never reclaimed, and over time your program uses more and more memory.</p><p>In crunch-c, unfreed blocks are reported as "ancient weeds": they grow in the arena like weeds in a garden.</p>',"tasksHtml":"<ol><li>Run this file. What warnings do you see?</li><li>The warnings should name the LINE where each unfreed block was allocated. What lines do you see?</li><li>Free p2 and run again. Are the warnings gone?</li></ol>","bonusHtml":"","code":`// Module 03, Exercise 04: Memory Leaks (Ancient Weeds)
//
// In C, forgetting to free memory is a memory leak.
// The memory is never reclaimed, and over time your program
// uses more and more memory.
//
// In crunch-c, unfreed blocks are reported as "ancient weeds":
// they grow in the arena like weeds in a garden.

// Allocate some memory and don't free it.
p1 = garrison(4)
p1.poke(i32, 42)

// Allocate more and don't free it.
p2 = garrison(8)
p2.poke(i64, 999)

// Free one of them.
scorch(p1)

// Leave p2 unfreed.

// YOUR TASK:
// 1. Run this file. What warnings do you see?
// 2. The warnings should name the LINE where each unfreed block
//    was allocated. What lines do you see?
// 3. Free p2 and run again. Are the warnings gone?

// In C, memory leaks are silent. Your program just gets slower
// and uses more memory. In crunch-c, you hear about every one.
`,"solution":'// Solution to Module 03, Exercise 04: Memory Leaks (Ancient Weeds)\n//\n// Task 1: the file as shipped ends with\n//\n//   spooked: ancient weeds - 1 pine never scorched (8 bytes),\n//            garrisoned at line 15\n//\n// p1 is freed, p2 is not, so exactly one block is still standing when the\n// program ends.\n//\n// Task 2: the warning names the line that ALLOCATED the block, not the line\n// where the program ended. That is the only line that can help you: a leak\n// has no site of failure, which is what makes it hard. Nothing goes wrong at\n// any particular moment; the program simply never gets around to cleaning up.\n//\n// Task 3: scorch p2 as well and the warning disappears entirely. There is no\n// "leaks: 0" line; a clean run is silent. This file is the clean version, so\n// running it prints the values and nothing else.\n\np1 = garrison(4)\np1.poke(i32, 42)\nprint(f"p1 holds: {p1.peek(i32)}")\n\np2 = garrison(8)\np2.poke(i64, i64(999))\nprint(f"p2 holds: {p2.peek(i64)}")\n\nscorch(p1)\nprint("p1 scorched")\n\n// Task 3: the line the exercise leaves out. Comment it back out and the run\n// ends with the ancient-weeds warning naming line 25.\nscorch(p2)\nprint("p2 scorched")\n\nprint("")\nprint("both blocks freed: the run ends silent, no ancient weeds")\n\n// Leaks report at program exit, not at the moment of the mistake, so a leak\n// warning is the last thing you see rather than the first. In C nothing\n// reports them at all: the process exits, the OS reclaims the pages, and the\n// only symptom is a long-running program that slowly grows.\n'},{"module":"04-structs","moduleTitle":"Module 04: Structs","number":"01","slug":"01-floorplan","title":"Defining Structs","introHtml":"<p>In C, you define a struct like this:</p><pre><code>struct Point {\n    int x;\n    int y;\n};</code></pre><p>In crunch-c, you use floorplan:</p><pre><code>floorplan Point {\n    x: i32\n    y: i32\n}</code></pre>","tasksHtml":'<ol><li>Run this file. What does it print?</li><li>Define a floorplan called "Person" with fields: - name: u8[16]  (a fixed-size string) - age: u8</li><li>Create a Person and set its age to 25.</li></ol>',"bonusHtml":"","code":'// Module 04, Exercise 01: Defining Structs\n//\n// In C, you define a struct like this:\n//   struct Point {\n//       int x;\n//       int y;\n//   };\n//\n// In crunch-c, you use floorplan:\n//   floorplan Point {\n//       x: i32\n//       y: i32\n//   }\n\n// Define a struct.\nfloorplan Point {\n    x: i32\n    y: i32\n}\n\n// Create an instance. Pass the floorplan to garrison(), not a byte count.\n// The pine then knows what it points at, so fields have names instead of\n// offsets, the way p->x does in C.\np = garrison(Point)\np.x = i32(10)\np.y = i32(20)\n\nprint(f"point: ({p.x}, {p.y})")\n\nscorch(p)\n\n// YOUR TASK:\n// 1. Run this file. What does it print?\n// 2. Define a floorplan called "Person" with fields:\n//    - name: u8[16]  (a fixed-size string)\n//    - age: u8\n// 3. Create a Person and set its age to 25.\n\nfloorplan Person {\n    name: u8[16]\n    age: u8\n}\n\nperson = garrison(Person)\nperson.age = u8(25)\nprint(f"person age: {person.age}")\n\nscorch(person)\n',"solution":`// Solution to Module 04, Exercise 01: Defining Structs
//
// Task 1: it prints "point: (10, 20)". Passing the floorplan to garrison()
// rather than a byte count is what makes p.x work: the pine knows what it
// points at, so the floorplan does the offset arithmetic, exactly the job the
// C compiler does when you write p->x.

floorplan Point {
    x: i32
    y: i32
}

p = garrison(Point)
p.x = i32(10)
p.y = i32(20)
print(f"point: ({p.x}, {p.y})")

// Tasks 2 and 3: a Person with a fixed-size name buffer and an age.
floorplan Person {
    name: u8[16]
    age: u8
}

person = garrison(Person)
person.age = u8(25)
print(f"person age: {person.age}")

// The name field is 16 bytes of storage, not a string type. It has no length
// and no terminator unless you write one: this is C's char[16], with all of
// C's ways to get it wrong. Spell "MG" into the first two bytes:
person.name[0] = u8(77)     // 'M'
person.name[1] = u8(71)     // 'G'
person.name[2] = u8(0)      // the terminator C would expect

print("")
print(f"sizeof(Point)  = {sizeof(Point)}")
print(f"sizeof(Person) = {sizeof(Person)}")
layout(Person)

// Person is 17 bytes with no padding: sixteen u8s followed by one more. Every
// field is byte-aligned, so nothing needs a gap. Exercise 02 shows what
// happens the moment a wider field joins in.

bathysphere(person)

scorch(p)
scorch(person)
`},{"module":"04-structs","moduleTitle":"Module 04: Structs","number":"02","slug":"02-layout","title":"Visualizing Layout","introHtml":"<p>In C, you can use offsetof() to see where fields are. In crunch-c, layout() shows you a complete picture: offset, size, field name, type, and padding.</p>","tasksHtml":"<ol><li>Run this file. What does the layout show?</li><li>How many bytes of padding do you see?</li><li>What is the total sizeof(Loose)?</li></ol>","bonusHtml":"","code":'// Module 04, Exercise 02: Visualizing Layout\n//\n// In C, you can use offsetof() to see where fields are.\n// In crunch-c, layout() shows you a complete picture:\n// offset, size, field name, type, and padding.\n\n// Define a struct with intentionally bad field ordering.\nfloorplan Loose {\n    a: u8\n    b: i32\n    c: u8\n}\n\n// Show the layout.\nlayout(Loose)\n\n// YOUR TASK:\n// 1. Run this file. What does the layout show?\n// 2. How many bytes of padding do you see?\n// 3. What is the total sizeof(Loose)?\n\nprint(f"sizeof(Loose) = {sizeof(Loose)}")\nprint(f"alignof(Loose) = {alignof(Loose)}")\n\n// In C, this struct wastes 6 bytes on padding.\n// That might not sound like much, but if you have\n// an array of 1 million Loose structs, you waste 6 MB.\n',"solution":'// Solution to Module 04, Exercise 02: Visualizing Layout\n//\n// Task 1: layout(Loose) prints a row per field plus a row per padding gap:\n//\n//   floorplan Loose - 12 bytes, align 4\n//      off  size  field            type\n//        0     1  a                u8\n//        1     3  -- padding --\n//        4     4  b                i32\n//        8     1  c                u8\n//        9     3  -- tail padding --\n//\n// Task 2: 6 bytes of padding; 3 after `a` and 3 after `c`.\n//\n// Task 3: sizeof(Loose) is 12.\n//\n// The two gaps exist for different reasons, and that distinction is the whole\n// lesson:\n//\n//   - The 3 bytes after `a` are ALIGNMENT padding. `b` is an i32 and must\n//     start on a multiple of 4. `a` used byte 0, so bytes 1-3 are burned to\n//     get there.\n//   - The 3 bytes after `c` are TAIL padding. The struct\'s own alignment is 4\n//     (the widest field\'s), so its size must be a multiple of 4: otherwise\n//     the second element of an array of Loose would start misaligned.\n//\n// Tail padding is the one people forget. It exists to make arrays work.\n\nfloorplan Loose {\n    a: u8\n    b: i32\n    c: u8\n}\n\nlayout(Loose)\n\nprint(f"sizeof(Loose) = {sizeof(Loose)}")\nprint(f"alignof(Loose) = {alignof(Loose)}")\n\n// 6 of 12 bytes are padding: this struct is half air. Across an array of a\n// million, that is 6 MB spent on nothing. Exercise 03 reclaims it.\nprint("")\nprint("in an array of 1,000,000 Loose:")\nprint(f"  total bytes: {sizeof(Loose) * 1000000}")\nprint(f"  wasted on padding: {6 * 1000000}")\n'},{"module":"04-structs","moduleTitle":"Module 04: Structs","number":"03","slug":"03-packing","title":"Field Ordering and Packing","introHtml":"<p>In C, reordering struct fields can reduce padding. Put the largest fields first, smallest last.</p><p>This exercise compares two orderings of the same fields.</p>","tasksHtml":"<ol><li>Run this file. What's the size difference?</li><li>Why is Tight smaller than Loose?</li><li>Create a floorplan with fields: u8, u8, i32, u8 What order minimizes padding?</li><li>Create a floorplan with fields: i32, u8, i64, u8 Try different orderings. Which is smallest?</li></ol>","bonusHtml":"","code":`// Module 04, Exercise 03: Field Ordering and Packing
//
// In C, reordering struct fields can reduce padding.
// Put the largest fields first, smallest last.
//
// This exercise compares two orderings of the same fields.

floorplan Loose {
    a: u8
    b: i32
    c: u8
}

floorplan Tight {
    b: i32
    a: u8
    c: u8
}

print("=== Loose ordering ===")
layout(Loose)
print(f"sizeof(Loose) = {sizeof(Loose)}")

print("")
print("=== Tight ordering ===")
layout(Tight)
print(f"sizeof(Tight) = {sizeof(Tight)}")

// YOUR TASK:
// 1. Run this file. What's the size difference?
// 2. Why is Tight smaller than Loose?
// 3. Create a floorplan with fields: u8, u8, i32, u8
//    What order minimizes padding?
// 4. Create a floorplan with fields: i32, u8, i64, u8
//    Try different orderings. Which is smallest?

// In C, this is called "struct packing."
// It matters for memory-efficient data structures,
// network protocols, and file formats.
`,"solution":`// Solution to Module 04, Exercise 03: Field Ordering and Packing
//
// Task 1: Loose is 12 bytes, Tight is 8. Reordering saves 4 bytes: a third
// of the struct, without changing a single field.
//
// Task 2: Tight is smaller because it puts the i32 first. Starting at offset
// 0, the i32 is already aligned, so no gap is needed to reach it. The two u8s
// then fill bytes 4 and 5, and only 2 bytes of tail padding round the struct
// up to a multiple of its 4-byte alignment. Loose instead opens with a u8,
// which forces 3 wasted bytes to reach the i32, and closes with a u8, which
// forces 3 more.
//
// The general rule: order fields widest first. Each field lands on its own
// alignment automatically, and all the slack collects in one place at the end.

floorplan Loose {
    a: u8
    b: i32
    c: u8
}

floorplan Tight {
    b: i32
    a: u8
    c: u8
}

print("=== Loose ordering ===")
layout(Loose)
print(f"sizeof(Loose) = {sizeof(Loose)}")

print("")
print("=== Tight ordering ===")
layout(Tight)
print(f"sizeof(Tight) = {sizeof(Tight)}")

// Task 3: fields u8, u8, i32, u8.
//
// Worst order is the one given: 12 bytes. Best is i32 first, then the three
// u8s: 8 bytes. The i32 needs 4-byte alignment; put it at offset 0 and the
// u8s fill 4, 5 and 6, leaving 1 byte of tail padding.
print("")
print("=== Task 3: u8, u8, i32, u8 ===")

floorplan Task3Worst {
    p: u8
    q: u8
    r: i32
    s: u8
}

floorplan Task3Best {
    r: i32
    p: u8
    q: u8
    s: u8
}

layout(Task3Worst)
print(f"sizeof as given (u8,u8,i32,u8) = {sizeof(Task3Worst)}")
print("")
layout(Task3Best)
print(f"sizeof widest-first (i32,u8,u8,u8) = {sizeof(Task3Best)}")

// Task 4: fields i32, u8, i64, u8.
//
// As given: 24 bytes. Widest first (i64, i32, u8, u8): 16 bytes. The i64
// drags the struct's alignment up to 8, so a badly placed i64 wastes even
// more than a badly placed i32: the gap needed to reach it is bigger.
print("")
print("=== Task 4: i32, u8, i64, u8 ===")

floorplan Task4Worst {
    w: i32
    x: u8
    y: i64
    z: u8
}

floorplan Task4Best {
    y: i64
    w: i32
    x: u8
    z: u8
}

layout(Task4Worst)
print(f"sizeof as given (i32,u8,i64,u8) = {sizeof(Task4Worst)}")
print("")
layout(Task4Best)
print(f"sizeof widest-first (i64,i32,u8,u8) = {sizeof(Task4Best)}")

print("")
print(f"Task 3 saved {sizeof(Task3Worst) - sizeof(Task3Best)} bytes")
print(f"Task 4 saved {sizeof(Task4Worst) - sizeof(Task4Best)} bytes")

// This is why protocol and file-format headers are laid out widest-first, and
// why C compilers are not allowed to reorder fields for you: the layout is
// part of the interface. Anything reading those bytes, another program, a
// network peer, a file written last year, depends on the exact order.
`},{"module":"04-structs","moduleTitle":"Module 04: Structs","number":"04","slug":"04-self-ref","title":"Self-Referencing Structs","introHtml":"<p>In C, a struct can contain a pointer to itself. This is how linked lists, trees, and other data structures work.</p><p>In crunch-c, a pine field names the floorplan it points at, including its own, which is what makes a linked list possible.</p>","tasksHtml":"<ol><li>Run this file. Does it print 10, 20, 30?</li><li>Add a fourth node with value 40.</li><li>Write a function that counts the nodes in the list.</li><li>What happens if you forget to link a node?</li></ol>","bonusHtml":"<p>Use bathysphere (the hex dump from Module 02) to inspect the raw memory of a node. Can you spot the value and the pointer? Run layout(Node) alongside it if you want the field offsets to compare against.</p>","code":'// Module 04, Exercise 04: Self-Referencing Structs\n//\n// In C, a struct can contain a pointer to itself.\n// This is how linked lists, trees, and other data structures work.\n//\n// In crunch-c, a pine field names the floorplan it points at, including\n// its own, which is what makes a linked list possible.\n\n// Define a linked list node.\nfloorplan Node {\n    value: i32\n    next: pine[Node]\n}\n\n// Create three nodes.\nn1 = garrison(Node)\nn1.value = i32(10)\nn1.next = none        // no next node yet\n\nn2 = garrison(Node)\nn2.value = i32(20)\nn2.next = none\n\nn3 = garrison(Node)\nn3.value = i32(30)\nn3.next = none\n\n// Link them: n1 -> n2 -> n3\nn1.next = n2\nn2.next = n3\n\n// Traverse the list. A null pine reads back as none, which is how you know\n// you have reached the end.\ncurrent = n1\nwhile current != none {\n    print(f"node value: {current.value}")\n    current = current.next\n}\n\nscorch(n1)\nscorch(n2)\nscorch(n3)\n\n// YOUR TASK:\n// 1. Run this file. Does it print 10, 20, 30?\n// 2. Add a fourth node with value 40.\n// 3. Write a function that counts the nodes in the list.\n// 4. What happens if you forget to link a node?\n\n// BONUS: Use bathysphere (the hex dump from Module 02) to inspect the raw\n// memory of a node. Can you spot the value and the pointer? Run layout(Node)\n// alongside it if you want the field offsets to compare against.\n',"solution":'// Solution to Module 04, Exercise 04: Self-Referencing Structs\n//\n// Task 1: yes; it prints 10, 20, 30.\n//\n// Task 4: if you forget to link a node it is simply never visited. The list\n// still traverses cleanly and stops early, because `next` was initialised to\n// none. Nothing errors. The node stays allocated but unreachable, so the run\n// ends with an ancient-weeds warning naming its garrison line: a leak, which\n// is exactly what an unreachable heap node is in C.\n//\n// Worth noticing: that only holds because every node\'s next is set to none up\n// front. Skip that and the field holds whatever was in the block already,\n// which C would happily follow into nowhere.\n\nfloorplan Node {\n    value: i32\n    next: pine[Node]\n}\n\n// Task 2: four nodes rather than three.\nn1 = garrison(Node)\nn1.value = i32(10)\nn1.next = none\n\nn2 = garrison(Node)\nn2.value = i32(20)\nn2.next = none\n\nn3 = garrison(Node)\nn3.value = i32(30)\nn3.next = none\n\nn4 = garrison(Node)\nn4.value = i32(40)\nn4.next = none\n\nn1.next = n2\nn2.next = n3\nn3.next = n4\n\n// Traverse.\ncurrent = n1\nwhile current != none {\n    print(f"node value: {current.value}")\n    current = current.next\n}\n\n// Task 3: count the nodes.\n//\n// The walk is the same shape as the traversal above: follow next until it\n// reads none. This is the loop at the heart of every linked-list operation in\n// C, and the reason a broken next field is so destructive: nothing else knows\n// where the list ends.\nfn count_nodes(head) {\n    n = 0\n    cur = head\n    while cur != none {\n        n = n + 1\n        cur = cur.next\n    }\n    return n\n}\n\nprint("")\nprint(f"node count: {count_nodes(n1)}")\nprint(f"count from n3: {count_nodes(n3)}")\nprint(f"count from none: {count_nodes(none)}")\n\n// BONUS: the raw memory of one node. value sits in the first 4 bytes; next is\n// a pine, 8 bytes, after 4 bytes of alignment padding: the same padding rule\n// as Exercise 02, here forced by the pointer\'s own width.\nprint("")\nlayout(Node)\nbathysphere(n1)\n\nscorch(n1)\nscorch(n2)\nscorch(n3)\nscorch(n4)\n'},{"module":"05-advanced","moduleTitle":"Module 05: Advanced","number":"01","slug":"01-osmosis","title":"Type Casting (Osmosis)","introHtml":"<p>In C, you cast between types with (type)value:</p><pre><code>int x = 42;\nchar c = (char)x;   // truncate to 8 bits\nfloat f = (float)x; // convert to float</code></pre><p>In crunch-c, you use osmosis():</p><pre><code>x = i32(42)\nc = osmosis(x, u8)   // truncate to 8 bits\nf = osmosis(x, f32)  // convert to float</code></pre>","tasksHtml":"<ol><li>What is osmosis(i32(256), u8)? (Hint: wrapping)</li><li>What is osmosis(i32(-1), u8)? (Hint: think about two's complement)</li><li>What is osmosis(f32(3.14), i32)? (Hint: truncation)</li><li>Why doesn't i32 + u8 work without osmosis? (Hint: C's implicit promotion rules)</li></ol>","bonusHtml":"<p>In C, casting between signed and unsigned is a common source of bugs. Try:</p><pre><code>osmosis(i32(-1), u32)</code></pre><p>What value do you get?</p>","code":`// Module 05, Exercise 01: Type Casting (Osmosis)
//
// In C, you cast between types with (type)value:
//   int x = 42;
//   char c = (char)x;   // truncate to 8 bits
//   float f = (float)x; // convert to float
//
// In crunch-c, you use osmosis():
//   x = i32(42)
//   c = osmosis(x, u8)   // truncate to 8 bits
//   f = osmosis(x, f32)  // convert to float

// Start with a large value.
big = i32(300)

// Truncate to u8 (0-255).
small = osmosis(big, u8)
print(f"i32(300) -> u8: {small}")

// Convert to float.
flt = osmosis(big, f32)
print(f"i32(300) -> f32: {flt}")

// YOUR TASK:
// 1. What is osmosis(i32(256), u8)? (Hint: wrapping)
// 2. What is osmosis(i32(-1), u8)? (Hint: think about two's complement)
// 3. What is osmosis(f32(3.14), i32)? (Hint: truncation)
// 4. Why doesn't i32 + u8 work without osmosis?
//    (Hint: C's implicit promotion rules)

// BONUS: In C, casting between signed and unsigned is a
// common source of bugs. Try:
//   osmosis(i32(-1), u32)
// What value do you get?
`,"solution":`// Solution to Module 05, Exercise 01: Type Casting (Osmosis)
//
// Task 1: osmosis(i32(256), u8) is 0. 256 needs nine bits; a u8 keeps eight.
// The ninth bit is dropped and what remains is zero.
//
// Task 2: osmosis(i32(-1), u8) is 255. In two's complement -1 is all ones.
// Take the low eight bits and you have 11111111, which read as unsigned is
// 255. The bits did not change: only the interpretation did.
//
// Task 3: osmosis(f32(3.14), i32) is 3. Float-to-int truncates toward zero,
// discarding the fraction. It does not round: 3.9 would also give 3.
//
// Task 4: i32 + u8 is rejected because crunch-c has NO integer promotion.
// C would silently promote both operands to a common type and hand you a
// result, and the rules for which type wins are subtle enough that the answer
// is often not what you meant: signed/unsigned comparisons that are always
// true being the classic case. crunch-c makes you say which one you meant.

big = i32(300)
print(f"i32(300) -> u8:  {osmosis(big, u8)}")
print(f"i32(300) -> f32: {osmosis(big, f32)}")

print("")
print(f"Task 1: osmosis(i32(256), u8)   = {osmosis(i32(256), u8)}")
print(f"Task 2: osmosis(i32(-1), u8)    = {osmosis(i32(-1), u8)}")
print(f"Task 3: osmosis(f32(3.14), i32) = {osmosis(f32(3.14), i32)}")

// Task 4 demonstrated. Uncomment to see the refusal:
//
//   contemplate at line N, column M
//   cannot use '+' on i32 and u8 - convert one first, e.g. osmosis(x, i32)
//
// a = i32(1)
// b = u8(2)
// c = a + b

// The fix is to say which width you want the arithmetic done in:
a = i32(1)
b = u8(2)
c = a + osmosis(b, i32)
print("")
print(f"i32(1) + osmosis(u8(2), i32) = {c}")

// BONUS: osmosis(i32(-1), u32).
//
// The answer is 4294967295: the largest u32. Same all-ones bit pattern as
// -1, read as unsigned. This is the single most productive bug in C: a
// negative length or index cast to unsigned becomes an enormous positive
// number, and the bounds check that was supposed to catch it passes.
print("")
print(f"BONUS: osmosis(i32(-1), u32) = {osmosis(i32(-1), u32)}")
print("      -1 and 4294967295 are the same 32 bits, read two ways")
`},{"module":"05-advanced","moduleTitle":"Module 05: Advanced","number":"02","slug":"02-arrays","title":"Fixed-Size Arrays","introHtml":"<p>In C, you can have fixed-size arrays in structs:</p><pre><code>struct Buffer {\n    int data[16];\n    int length;\n};</code></pre><p>In crunch-c, you declare array fields with [count]:</p><pre><code>floorplan Buffer {\n    data: i32[16]\n    length: i32\n}</code></pre><p>Scalar fields are reached by name (buf.length). Array elements are reached with pointer arithmetic, stepping by the element's width: an i32 is 4 bytes, so element i lives at offset i * 4. This is exactly what C's buf.data[i] compiles down to.</p>","tasksHtml":'<ol><li>Run this file. Does it print the values correctly?</li><li>Create a floorplan "Matrix" with a 3x3 grid of i32 values.</li><li>Write values to fill the matrix.</li><li>What happens if you write past the array bounds?</li></ol>',"bonusHtml":"","code":`// Module 05, Exercise 02: Fixed-Size Arrays
//
// In C, you can have fixed-size arrays in structs:
//   struct Buffer {
//       int data[16];
//       int length;
//   };
//
// In crunch-c, you declare array fields with [count]:
//   floorplan Buffer {
//       data: i32[16]
//       length: i32
//   }
//
// Scalar fields are reached by name (buf.length). Array elements are reached
// with pointer arithmetic, stepping by the element's width: an i32 is 4
// bytes, so element i lives at offset i * 4. This is exactly what C's
// buf.data[i] compiles down to.

// Define a buffer that holds 4 i32 values.
floorplan Buffer {
    data: i32[4]
    length: i32
}

// Create and populate a buffer.
buf = garrison(Buffer)
buf.length = i32(0)

// Write values using pointer arithmetic. Naming the element pine first keeps
// the offset arithmetic readable, and avoids starting a line with '(', which
// crunch-c would read as a call on the line above.
i = 0
while i < 4 {
    slot = buf + i * 4      // each i32 is 4 bytes
    slot.poke(i32, i32((i + 1) * 10))
    i = i + 1
}

buf.length = i32(4)

// Read them back.
print(f"buffer has {buf.length} elements")

i = 0
while i < buf.length {
    slot = buf + i * 4
    print(f"data[{i}] = {slot.peek(i32)}")
    i = i + 1
}

// data occupies the first 16 bytes, so length lands at offset 16.
layout(Buffer)
bathysphere(buf)

scorch(buf)

// YOUR TASK:
// 1. Run this file. Does it print the values correctly?
// 2. Create a floorplan "Matrix" with a 3x3 grid of i32 values.
// 3. Write values to fill the matrix.
// 4. What happens if you write past the array bounds?
`,"solution":`// Solution to Module 05, Exercise 02: Fixed-Size Arrays
//
// Task 1: yes; 10, 20, 30, 40.
//
// Task 4 is the one worth sitting with, because the answer is "it depends,
// and the dangerous case is the quiet one."
//
// A Buffer is 20 bytes: data covers 0..15, length covers 16..19. Element 4 of
// a 4-element array is at offset 16, which is length. Writing there is still
// INSIDE the block, so the arena permits it and silently overwrites length.
// No fault, no warning. That is precisely the C behaviour: an array field is
// just bytes, the index is not checked, and the neighbour absorbs the damage.
//
// Keep going and eventually you leave the block. At that point it is caught:
//
//   area does not exist at line N, column M
//   byte 100..103 is outside this pine's block, which covers 0..19
//
// So the arena guards the block boundary, not the field boundary. Overrun far
// enough and you are told; overrun by one and you have corrupted your own
// struct, which is the overflow that actually ships.

floorplan Buffer {
    data: i32[4]
    length: i32
}

buf = garrison(Buffer)

i = 0
while i < 4 {
    slot = buf + i * 4
    slot.poke(i32, i32((i + 1) * 10))
    i = i + 1
}
buf.length = i32(4)

print(f"buffer has {buf.length} elements")
i = 0
while i < buf.length {
    slot = buf + i * 4
    print(f"data[{i}] = {slot.peek(i32)}")
    i = i + 1
}

// Task 4, the quiet case: element 4 lands on length.
print("")
print(f"length before writing data[4]: {buf.length}")
overrun = buf + 4 * 4
overrun.poke(i32, i32(999))
print(f"length after writing data[4]:  {buf.length}")
print("no fault: the write stayed inside the block and ate the next field")

// Tasks 2 and 3: a 3x3 matrix.
//
// Array fields are one-dimensional, so a 3x3 grid is nine elements indexed
// row * 3 + col, exactly how C lays out int m[3][3] in memory. C's
// two-dimensional syntax is a convenience; the bytes are a single run.
print("")
floorplan Matrix {
    cells: i32[9]
    rows: u8
    cols: u8
}

m = garrison(Matrix)
m.rows = u8(3)
m.cols = u8(3)

row = 0
while row < 3 {
    col = 0
    while col < 3 {
        cell = m + (row * 3 + col) * 4
        cell.poke(i32, i32(row * 3 + col + 1))
        col = col + 1
    }
    row = row + 1
}

print("3x3 matrix:")
row = 0
while row < 3 {
    line = ""
    col = 0
    while col < 3 {
        cell = m + (row * 3 + col) * 4
        line = line + f"{cell.peek(i32)} "
        col = col + 1
    }
    print(f"  {line}")
    row = row + 1
}

layout(Matrix)
scorch(m)

// Task 4, the loud case: far enough past the end to leave the block.
// This ends the program, so it goes last.
print("")
print("now writing 100 bytes into a 20-byte block...")
far = buf + 100
far.poke(i32, i32(1))
print("unreachable")
`},{"module":"05-advanced","moduleTitle":"Module 05: Advanced","number":"03","slug":"03-binary-protocol","title":"Binary Protocol Parsing","introHtml":'<p>In C, network protocols and file formats are often binary: a header with fixed fields, followed by variable-length data.</p><p>This exercise parses a simple binary protocol:</p><pre><code>- 2 bytes: magic number (0x4D47 = "MG" = 19783 decimal)\n- 1 byte: version\n- 1 byte: flags\n- 4 bytes: payload length\n- N bytes: payload</code></pre><p>crunch-c has no hex literals, so the constants below are written in decimal with the hex value in a comment. bathysphere() dumps the bytes in hex, which is where you actually want to read them anyway.</p>',"tasksHtml":`<ol><li>Run this file. Does the round-trip work?</li><li>Add a "checksum" field (u8) to the header.</li><li>What's the total header size with the checksum?</li><li>Create a floorplan for a more complex protocol: - 4 bytes: magic ("TEST") - 2 bytes: message type - 2 bytes: sequence number - 4 bytes: timestamp - 2 bytes: data length - N bytes: data</li></ol>`,"bonusHtml":"<p>Look at the bathysphere dump above. Can you find each header field? This header has NO padding: 2 + 1 + 1 lands exactly on the 4-byte boundary payload_len needs. Real protocols are designed that way on purpose. Add the u8 checksum from task 2 and see what the layout does about it.</p>","code":`// Module 05, Exercise 03: Binary Protocol Parsing
//
// In C, network protocols and file formats are often binary:
// a header with fixed fields, followed by variable-length data.
//
// This exercise parses a simple binary protocol:
//   - 2 bytes: magic number (0x4D47 = "MG" = 19783 decimal)
//   - 1 byte: version
//   - 1 byte: flags
//   - 4 bytes: payload length
//   - N bytes: payload
//
// crunch-c has no hex literals, so the constants below are written in
// decimal with the hex value in a comment. bathysphere() dumps the bytes
// in hex, which is where you actually want to read them anyway.

floorplan PacketHeader {
    magic: u16
    version: u8
    flags: u8
    payload_len: u32
}

// Build a packet header in memory.
header = garrison(PacketHeader)

header.magic = u16(19783)      // 0x4D47, "MG"
header.version = u8(1)
header.flags = u8(15)          // 0x0F
header.payload_len = u32(4)

// Show the layout.
layout(PacketHeader)
print(f"header size: {sizeof(PacketHeader)}")

// Parse the header back.
print("")
print(f"magic: {header.magic}")
print(f"version: {header.version}")
print(f"flags: {header.flags}")
print(f"payload length: {header.payload_len}")

// The raw bytes, annotated field by field. Look for 47 4d: the magic number
// stored little-endian, low byte first, which is why "MG" reads backwards.
bathysphere(header)

scorch(header)

// YOUR TASK:
// 1. Run this file. Does the round-trip work?
// 2. Add a "checksum" field (u8) to the header.
// 3. What's the total header size with the checksum?
// 4. Create a floorplan for a more complex protocol:
//    - 4 bytes: magic ("TEST")
//    - 2 bytes: message type
//    - 2 bytes: sequence number
//    - 4 bytes: timestamp
//    - 2 bytes: data length
//    - N bytes: data

// BONUS: Look at the bathysphere dump above. Can you find each header field?
// This header has NO padding: 2 + 1 + 1 lands exactly on the 4-byte boundary
// payload_len needs. Real protocols are designed that way on purpose. Add the
// u8 checksum from task 2 and see what the layout does about it.
`,"solution":`// Solution to Module 05, Exercise 03: Binary Protocol Parsing
//
// Task 1: yes, the round-trip works. Every field comes back as written.
//
// Task 3: adding a u8 checksum takes the header from 8 bytes to 12, not 9.
// The struct's alignment is 4 (payload_len is a u32), so its size must be a
// multiple of 4. One extra byte costs four. That is the tail-padding rule
// from Module 04 showing up somewhere it actually matters: if the peer on
// the other end of the wire assumes 9, every field after the header is
// misaligned and the protocol is broken.

floorplan PacketHeader {
    magic: u16
    version: u8
    flags: u8
    payload_len: u32
}

header = garrison(PacketHeader)
header.magic = u16(19783)      // 0x4D47, "MG"
header.version = u8(1)
header.flags = u8(15)          // 0x0F
header.payload_len = u32(4)

layout(PacketHeader)
print(f"header size: {sizeof(PacketHeader)}")

print("")
print(f"magic: {header.magic}")
print(f"version: {header.version}")
print(f"flags: {header.flags}")
print(f"payload length: {header.payload_len}")

// The bytes read 47 4d, not 4d 47: little-endian stores the low byte first,
// so the magic number spells "GM" in the dump even though it is "MG" on the
// wire. Every binary protocol has to pick an endianness and say so; network
// byte order is big-endian precisely to stop this being ambiguous.
bathysphere(header)

scorch(header)

// Task 2: the same header with a checksum.
print("")
print("=== Task 2: with a checksum ===")

floorplan PacketHeaderSummed {
    magic: u16
    version: u8
    flags: u8
    payload_len: u32
    checksum: u8
}

layout(PacketHeaderSummed)
print(f"with checksum: {sizeof(PacketHeaderSummed)} bytes")
print(f"one extra byte cost {sizeof(PacketHeaderSummed) - sizeof(PacketHeader)}")

// Reordering does not rescue it. Tucking the checksum in beside the other
// u8s still gives 12, because the five fields need 9 bytes and 9 rounded up
// to a multiple of the struct's 4-byte alignment is 12 whatever the order.
// Widest-first is a good habit, not a cure: once the payload is 9 bytes,
// 12 is the floor.
floorplan PacketHeaderPacked {
    magic: u16
    version: u8
    flags: u8
    checksum: u8
    payload_len: u32
}
print("")
layout(PacketHeaderPacked)
print(f"checksum moved before payload_len: {sizeof(PacketHeaderPacked)} bytes")

// Task 4: a larger protocol.
//
// The magic is four bytes of text, so it is a u8[4], not a number: "TEST"
// has no numeric meaning and storing it as a u32 would make its byte order
// depend on the machine. Text fields stay byte arrays for exactly that reason.
print("")
print("=== Task 4: a larger protocol ===")

floorplan Message {
    magic: u8[4]         // "TEST"
    msg_type: u16
    sequence: u16
    timestamp: u32
    data_len: u16
}

layout(Message)
print(f"sizeof(Message) = {sizeof(Message)}")

msg = garrison(Message)
msg.msg_type = u16(7)
msg.sequence = u16(1)
msg.timestamp = u32(1700000000)
msg.data_len = u16(0)

// Spell "TEST" into the magic bytes. Array elements of a u8 field are single
// bytes, so writing them one at a time is the natural fit here.
tag = msg + 0
tag.poke(u8, u8(84))         // 'T'
tag = msg + 1
tag.poke(u8, u8(69))         // 'E'
tag = msg + 2
tag.poke(u8, u8(83))         // 'S'
tag = msg + 3
tag.poke(u8, u8(84))         // 'T'

print("")
print(f"msg_type: {msg.msg_type}")
print(f"sequence: {msg.sequence}")
print(f"timestamp: {msg.timestamp}")
print(f"data_len: {msg.data_len}")
bathysphere(msg)

// The dump spells TEST in the ASCII column because those bytes are text, not
// a number: no endianness to reverse them.

scorch(msg)
`},{"module":"06-strings","moduleTitle":"Module 06: Strings","number":"01","slug":"01-bytes-are-characters","title":"A String Is Bytes Plus A Zero","introHtml":'<p>C has no string type. A string is a block of bytes that ends with a zero byte: the NUL terminator. Nothing stores the length. The zero IS the end, and finding it is the only way to know where the string stops.</p><pre><code>char s[3] = "HI";   // 72, 73, 0: three bytes, not two</code></pre><p>crunch-c has no character literals, so we write the ASCII codes directly. A is 65, H is 72, a space is 32. See the module README for a short table.</p>',"tasksHtml":`<ol><li>Run this file. Find the 00 in the hex dump, and the '.' beside it.</li><li>Spell a different 2-letter word. Remember the terminator.</li><li>How many bytes does "CAT" need? Allocate exactly that many and write it. C is 67, A is 65, T is 84.</li><li>Now allocate a block WITHOUT room for the terminator and write only the letters into it. Look at the dump. Is anything obviously wrong? (Exercise 02 is about what happens when you try to use it.)</li></ol>`,"bonusHtml":"<p>byte 0 is not the only value with no printable character. Try writing 7, 27 or 127 and see what bathysphere shows in the gutter.</p>","code":`// Module 06, Exercise 01: A String Is Bytes Plus A Zero
//
// C has no string type. A string is a block of bytes that ends with a zero
// byte: the NUL terminator. Nothing stores the length. The zero IS the end,
// and finding it is the only way to know where the string stops.
//
//   char s[3] = "HI";   // 72, 73, 0: three bytes, not two
//
// crunch-c has no character literals, so we write the ASCII codes directly.
// A is 65, H is 72, a space is 32. See the module README for a short table.

// Three bytes: two letters and the terminator.
s = garrison(3)
s[0] = 72     // H
s[1] = 73     // I
s[2] = 0      // the terminator: this byte is the whole convention

// bathysphere prints the ASCII next to the hex. The '.' in the gutter is the
// terminator: byte value 0, which has no printable character.
bathysphere(s)

scorch(s)

// YOUR TASK:
// 1. Run this file. Find the 00 in the hex dump, and the '.' beside it.
// 2. Spell a different 2-letter word. Remember the terminator.
// 3. How many bytes does "CAT" need? Allocate exactly that many and write
//    it. C is 67, A is 65, T is 84.
// 4. Now allocate a block WITHOUT room for the terminator and write only the
//    letters into it. Look at the dump. Is anything obviously wrong?
//    (Exercise 02 is about what happens when you try to use it.)

// BONUS: byte 0 is not the only value with no printable character. Try
// writing 7, 27 or 127 and see what bathysphere shows in the gutter.
`,"solution":`// Solution to Module 06, Exercise 01: A String Is Bytes Plus A Zero
//
// Task 1: the dump is
//
//   0008  48 49 00                    |HI.|
//
// 48 and 49 are H and I in hex (72 and 73 in decimal). The third byte is 00,
// and the gutter shows '.' because byte 0 has no printable character. That
// dot is the string's terminator, and it is the only thing in the block that
// says where the text ends.
//
// Task 3: "CAT" needs FOUR bytes, not three. Three letters and the
// terminator. If you allocated three you got the letters and nothing else,
// which is Exercise 02's whole subject.
//
// Task 4: nothing looks wrong. That is the point worth carrying forward. A
// block holding "CAT" with no terminator is indistinguishable, by inspection,
// from a correct string; the bytes you wrote are all present and correct. The
// damage only appears when something tries to find the end.

// Task 2: a different two-letter word: "ON".
s = garrison(3)
s[0] = 79     // O
s[1] = 78     // N
s[2] = 0
bathysphere(s)
scorch(s)

// Task 3: "CAT": three letters plus the terminator is four bytes.
print("")
cat = garrison(4)
cat[0] = 67   // C
cat[1] = 65   // A
cat[2] = 84   // T
cat[3] = 0
bathysphere(cat)
scorch(cat)

// Task 4: the same three letters with no room for a terminator.
print("")
truncated = garrison(3)
truncated[0] = 67
truncated[1] = 65
truncated[2] = 84
bathysphere(truncated)
print("the letters are all correct, and this is not a string")
scorch(truncated)

// BONUS: unprintable bytes.
//
// 7 is BEL, 27 is ESC, 127 is DEL. None of them have a glyph, so bathysphere
// shows a '.' for each: the same '.' it shows for the terminator. The gutter
// tells you "not printable", not "zero", so you cannot find a terminator by
// reading the ASCII column alone. Read the hex.
print("")
odd = garrison(4)
odd[0] = 7
odd[1] = 27
odd[2] = 127
odd[3] = 65   // A, for contrast
bathysphere(odd)
print("three unprintable bytes and one 'A': only the hex distinguishes them")
scorch(odd)
`},{"module":"06-strings","moduleTitle":"Module 06: Strings","number":"02","slug":"02-strlen","title":"strlen, And What Happens Without A Terminator","introHtml":"<p>In C, strlen walks the string one byte at a time until it finds the zero:</p><pre><code>size_t strlen(const char *s) {\n    size_t n = 0;\n    while (s[n] != 0) n++;\n    return n;\n}</code></pre><p>That is the entire implementation. Note what it does NOT do: it never checks how big the buffer is, because it cannot. A pointer carries no size. The terminator is the only thing standing between this loop and the rest of memory.</p>","tasksHtml":"<ol><li>Run the file as-is. strlen(good) should be 2: the terminator is not counted, so a 3-byte block holds a 2-character string.</li><li>Uncomment the strlen(bad) line. What fault do you get, and which line of strlen does it name?</li><li>The fault reports a byte index. What is it, and why that one?</li><li>In real C there is no fault here. strlen keeps reading past the block into whatever comes next. What would it return? What would make it stop?</li></ol>","bonusHtml":"<p>strlen costs one full pass over the string every time you call it. Look at the loop and work out what <code>while (i &lt; strlen(s))</code> costs: it is a classic accidentally-quadratic bug.</p>","code":'// Module 06, Exercise 02: strlen, And What Happens Without A Terminator\n//\n// In C, strlen walks the string one byte at a time until it finds the zero:\n//\n//   size_t strlen(const char *s) {\n//       size_t n = 0;\n//       while (s[n] != 0) n++;\n//       return n;\n//   }\n//\n// That is the entire implementation. Note what it does NOT do: it never\n// checks how big the buffer is, because it cannot. A pointer carries no size.\n// The terminator is the only thing standing between this loop and the rest of\n// memory.\n\nfn strlen(p) {\n    n = 0\n    while p[n] != 0 {\n        n = n + 1\n    }\n    return n\n}\n\n// A properly terminated string: "HI" in three bytes.\ngood = garrison(3)\ngood[0] = 72\ngood[1] = 73\ngood[2] = 0\n\nbathysphere(good)\nprint(f"strlen = {strlen(good)}")\n\n// The same two letters, with no room for a terminator.\nbad = garrison(2)\nbad[0] = 72\nbad[1] = 73\n\nprint("")\nbathysphere(bad)\n\n// Uncomment the next line to walk it:\n// print(f"strlen = {strlen(bad)}")\n\nscorch(good)\nscorch(bad)\n\n// YOUR TASK:\n// 1. Run the file as-is. strlen(good) should be 2: the terminator is not\n//    counted, so a 3-byte block holds a 2-character string.\n// 2. Uncomment the strlen(bad) line. What fault do you get, and which line\n//    of strlen does it name?\n// 3. The fault reports a byte index. What is it, and why that one?\n// 4. In real C there is no fault here. strlen keeps reading past the block\n//    into whatever comes next. What would it return? What would make it\n//    stop?\n\n// BONUS: strlen costs one full pass over the string every time you call it.\n// Look at the loop and work out what `while (i < strlen(s))` costs: it is a\n// classic accidentally-quadratic bug.\n',"solution":'// Solution to Module 06, Exercise 02: strlen Without A Terminator\n//\n// Task 1: strlen(good) is 2. The block is three bytes; the string is two\n// characters. The terminator is stored but never counted, which is why\n// "how many bytes do I need" and "how long is the string" are different\n// questions with different answers, forever.\n//\n// Task 2: uncommenting strlen(bad) gives\n//\n//   area does not exist at line 18, column 11\n//     18 |     while p[n] != 0 {\n//   byte 2..2 is outside this pine\'s block, which covers 0..1\n//   Stack trace:\n//     strlen()\n//\n// The fault lands on the loop\'s own condition: the read that tests for the\n// terminator is the read that goes out of bounds. Note the stack trace names\n// strlen(), not the caller. In C the fault would also happen inside strlen,\n// which is a large part of why these bugs are hard to attribute: the function\n// that crashes is not the function that made the mistake.\n//\n// Task 3: byte 2. The block covers 0..1, so 2 is the first index past the\n// end. strlen read bytes 0 and 1, found 72 and 73, neither of them zero, and\n// asked for byte 2, because that is all it can do. It has no size to check\n// against.\n//\n// Task 4: in real C, nothing stops it. strlen keeps reading past the block\n// into the heap: allocator metadata, other allocations, freed memory. It\n// returns when it happens to encounter a zero byte, so the answer is\n// whatever the neighbouring memory contains: 2, or 40, or 4000, and a\n// different number on the next run. What makes it stop is either a stray\n// zero or an unmapped page, and only the second one is a crash you would\n// notice. This is why an unterminated string is not a "short string" bug; it\n// is an unbounded read of memory you do not own.\n\nfn strlen(p) {\n    n = 0\n    while p[n] != 0 {\n        n = n + 1\n    }\n    return n\n}\n\n// Task 1: a properly terminated string.\ngood = garrison(3)\ngood[0] = 72\ngood[1] = 73\ngood[2] = 0\n\nbathysphere(good)\nprint(f"strlen = {strlen(good)}")\nprint(f"block is 3 bytes, string is {strlen(good)} characters")\n\n// The terminator is what makes length findable. Move it and the length\n// changes without a single letter being touched.\nprint("")\ngood[1] = 0\nbathysphere(good)\nprint(f"same block, terminator moved to index 1; strlen is now {strlen(good)}")\n\n// BONUS: `while (i < strlen(s))` re-walks the whole string on every\n// iteration, so a loop over an N-character string does N passes of N steps.\n// That is O(N^2) to do something that should be O(N), and it is invisible in\n// the source: the loop reads like any other. Hoist the strlen out.\nprint("")\nprint("strlen is a walk, not a lookup: calling it in a loop condition")\nprint("re-walks the string every single iteration.")\n\nscorch(good)\n\n// Task 2 and 3: the unterminated block. Ends the program, so it goes last.\nbad = garrison(2)\nbad[0] = 72\nbad[1] = 73\n\nprint("")\nbathysphere(bad)\nprint("two letters, no terminator - now walking it with strlen...")\nprint(f"unreachable: {strlen(bad)}")\n'},{"module":"06-strings","moduleTitle":"Module 06: Strings","number":"03","slug":"03-off-by-one","title":"The + 1 That Everyone Forgets","introHtml":"<p>A buffer holding a string of length N needs N + 1 bytes: the text, then the terminator. This is where the <code>+ 1</code> scattered through every C program comes from:</p><pre><code>char *copy = malloc(strlen(src) + 1);   // correct\nchar *copy = malloc(strlen(src));       // one byte short, every time</code></pre><p>The second line is not obviously wrong, which is the problem. It allocates exactly enough room for the characters and no room at all for the thing that marks where they end.</p><p>NOTE: this file calls its length <code>need</code>, not <code>n</code>, on purpose. A variable assigned inside a crunch-c function is global, so calling strlen() again would overwrite an outer <code>n</code>. See the Functions section of Module 04.</p>","tasksHtml":"<ol><li>Run as-is. Compare the two dumps. The <code>wrong</code> block holds exactly the right letters: nothing about it looks broken.</li><li>Uncomment the <code>wrong[need] = 0</code> line. Where does the fault land, and what index does it name?</li><li>Without a terminator, what does strlen(wrong) do? Predict first, then try it.</li><li>Dump <code>right</code> before anything is written to it. crunch-c hands back zeroed memory, so what does strlen(right) say? Would that answer be safe to rely on in C, where malloc does not zero anything?</li></ol>","bonusHtml":"<p>C's strncpy takes a maximum length, which sounds like the fix. It is not: if the source is too long, strncpy copies up to the limit and writes NO terminator. Look up what it actually guarantees.</p>","code":'// Module 06, Exercise 03: The + 1 That Everyone Forgets\n//\n// A buffer holding a string of length N needs N + 1 bytes: the text, then the\n// terminator. This is where the `+ 1` scattered through every C program comes\n// from:\n//\n//   char *copy = malloc(strlen(src) + 1);   // correct\n//   char *copy = malloc(strlen(src));       // one byte short, every time\n//\n// The second line is not obviously wrong, which is the problem. It allocates\n// exactly enough room for the characters and no room at all for the thing\n// that marks where they end.\n//\n// NOTE: this file calls its length `need`, not `n`, on purpose. A variable\n// assigned inside a crunch-c function is global, so calling strlen() again\n// would overwrite an outer `n`. See the Functions section of Module 04.\n\nfn strlen(p) {\n    n = 0\n    while p[n] != 0 {\n        n = n + 1\n    }\n    return n\n}\n\n// "HELP" is four characters, so it needs five bytes.\nsrc = garrison(5)\nsrc[0] = 72   // H\nsrc[1] = 69   // E\nsrc[2] = 76   // L\nsrc[3] = 80   // P\nsrc[4] = 0\n\nneed = strlen(src)\nprint(f"strlen(src) = {need}")\nprint(f"bytes actually needed = {need} + 1")\nbathysphere(src)\n\n// The correct allocation.\nright = garrison(need + 1)\n\n// The tempting, wrong one: exactly strlen bytes, no room for the zero.\nwrong = garrison(need)\n\n// Copy the four characters in. This much fits.\ni = 0\nwhile i < need {\n    wrong[i] = src[i]\n    i = i + 1\n}\n\nprint("")\nbathysphere(wrong)\nprint("four characters fit, and there is nowhere left for the terminator")\n\n// Uncomment to try writing it anyway:\n// wrong[need] = 0\n\nscorch(src)\nscorch(right)\nscorch(wrong)\n\n// YOUR TASK:\n// 1. Run as-is. Compare the two dumps. The `wrong` block holds exactly the\n//    right letters: nothing about it looks broken.\n// 2. Uncomment the `wrong[need] = 0` line. Where does the fault land, and\n//    what index does it name?\n// 3. Without a terminator, what does strlen(wrong) do? Predict first, then\n//    try it.\n// 4. Dump `right` before anything is written to it. crunch-c hands back\n//    zeroed memory, so what does strlen(right) say? Would that answer be\n//    safe to rely on in C, where malloc does not zero anything?\n\n// BONUS: C\'s strncpy takes a maximum length, which sounds like the fix. It is\n// not: if the source is too long, strncpy copies up to the limit and writes\n// NO terminator. Look up what it actually guarantees.\n',"solution":'// Solution to Module 06, Exercise 03: The + 1\n//\n// Task 1: the two dumps are\n//\n//   0008  48 45 4c 50  00      |HELP.|     <- src, 5 bytes, correct\n//   0010  48 45 4c 50          |HELP|      <- wrong, 4 bytes, not a string\n//\n// Every letter in `wrong` is correct. The copy loop did exactly what it was\n// asked. There is no corruption, no garbage, nothing to see in a debugger:\n// the block simply stops one byte before the thing that says it stopped.\n//\n// Task 2: uncommenting `wrong[need] = 0` gives\n//\n//   area does not exist at line 57, column 1\n//   byte 4..4 is outside this pine\'s block, which covers 0..3\n//\n// need is 4, the block covers 0..3, so index 4 is the first byte past the\n// end. The terminator has nowhere to go. That is what `malloc(strlen(s))`\n// buys you: a buffer that fits the text and cannot hold the string.\n//\n// Task 3: strlen(wrong) walks off the end and faults, exactly as in\n// Exercise 02: it reads 0..3, finds no zero, and asks for byte 4. In C it\n// would keep going into the next allocation and return whatever it found.\n//\n// Task 4: this one has a trap in it.\n//\n// crunch-c zeroes every block it hands out, so a fresh `right` dumps as\n// 00 00 00 00 00 and strlen(right) is 0: a valid empty string, by accident.\n// C\'s malloc guarantees nothing of the kind. It hands you whatever those\n// bytes last held, so the same code in C reads uninitialised memory and\n// returns a length that depends on the heap\'s history. (calloc zeroes; malloc\n// does not, and the difference is exactly this bug.)\n//\n// So: being correctly sized and being initialised are two separate problems.\n// The + 1 solves the first. Only writing a terminator solves the second, and\n// crunch-c\'s zeroing is a courtesy you must not learn to depend on.\n\nfn strlen(p) {\n    n = 0\n    while p[n] != 0 {\n        n = n + 1\n    }\n    return n\n}\n\nsrc = garrison(5)\nsrc[0] = 72   // H\nsrc[1] = 69   // E\nsrc[2] = 76   // L\nsrc[3] = 80   // P\nsrc[4] = 0\n\nneed = strlen(src)\nprint(f"strlen(src) = {need}, so the buffer needs {need} + 1 = {need + 1} bytes")\nbathysphere(src)\n\n// Task 1: the wrong allocation, filled correctly.\nwrong = garrison(need)\ni = 0\nwhile i < need {\n    wrong[i] = src[i]\n    i = i + 1\n}\nprint("")\nbathysphere(wrong)\nprint("all four letters present, and it is still not a string")\n\n// Task 4: the right size, never written to.\nprint("")\nright = garrison(need + 1)\nbathysphere(right)\nprint(f"fresh block, zeroed by crunch-c - strlen says {strlen(right)}")\nprint("in C that block would hold whatever was there before, and strlen")\nprint("would return a number that depends on the heap\'s history.")\n\nscorch(src)\nscorch(right)\n\n// Task 2: the terminator that does not fit. Ends the program, so it goes\n// last.\nprint("")\nprint(f"now writing a terminator at index {need} of a {need}-byte block...")\nwrong[need] = 0\nprint("unreachable")\n'},{"module":"06-strings","moduleTitle":"Module 06: Strings","number":"04","slug":"04-strcpy","title":"Overrunning A Buffer","introHtml":`<p>This is the bug that made C famous.</p><pre><code>struct Record { char name[4]; int admin; };
strcpy(rec.name, "HELLO");   // 6 bytes into a 4-byte field</code></pre><p>strcpy copies until it reaches the source's terminator. It never looks at the size of the destination, because it cannot: all it has is a pointer. If the source is longer than the destination, it writes past the end and keeps going, straight into whatever the struct put next.</p>`,"tasksHtml":'<ol><li>Run it. The program does not fault. Look at admin before and after.</li><li>In the bathysphere dump, work out which bytes of "HELLO" landed in <code>name</code> and which landed in <code>admin</code>. Check against the layout() output.</li><li>Why did the arena not stop this? (Module 05 Exercise 02 met the same rule: the arena guards the BLOCK boundary, not the field boundary.)</li><li><code>admin</code> is the kind of field that decides whether someone is an administrator. Describe, in one sentence, what an attacker who controls the source string can do here.</li></ol>',"bonusHtml":"<p>make the source long enough to run off the end of the whole Record, not just past the name field. That one the arena does catch, and the difference between the two is the difference between a bug you find and a bug you ship.</p>","code":'// Module 06, Exercise 04: Overrunning A Buffer\n//\n// This is the bug that made C famous.\n//\n//   struct Record { char name[4]; int admin; };\n//   strcpy(rec.name, "HELLO");   // 6 bytes into a 4-byte field\n//\n// strcpy copies until it reaches the source\'s terminator. It never looks at\n// the size of the destination, because it cannot: all it has is a pointer.\n// If the source is longer than the destination, it writes past the end and\n// keeps going, straight into whatever the struct put next.\n\nfloorplan Record {\n    name: u8[4]\n    admin: i32\n}\n\nfn strcpy(dst, src) {\n    i = 0\n    while src[i] != 0 {\n        dst[i] = src[i]\n        i = i + 1\n    }\n    dst[i] = 0\n    return i\n}\n\n// "HELLO": five characters and a terminator, six bytes.\nsrc = garrison(6)\nsrc[0] = 72   // H\nsrc[1] = 69   // E\nsrc[2] = 76   // L\nsrc[3] = 76   // L\nsrc[4] = 79   // O\nsrc[5] = 0\n\n// A record whose name field has room for three characters and a terminator.\nrec = garrison(Record)\nrec.admin = i32(0)\n\nlayout(Record)\nprint(f"admin before the copy: {rec.admin}")\n\n// Copy six bytes into a four-byte field.\nstrcpy(rec, src)\n\nprint("")\nbathysphere(rec)\nprint(f"admin after the copy:  {rec.admin}")\n\nscorch(src)\nscorch(rec)\n\n// YOUR TASK:\n// 1. Run it. The program does not fault. Look at admin before and after.\n// 2. In the bathysphere dump, work out which bytes of "HELLO" landed in\n//    `name` and which landed in `admin`. Check against the layout() output.\n// 3. Why did the arena not stop this? (Module 05 Exercise 02 met the same\n//    rule: the arena guards the BLOCK boundary, not the field boundary.)\n// 4. `admin` is the kind of field that decides whether someone is an\n//    administrator. Describe, in one sentence, what an attacker who controls\n//    the source string can do here.\n\n// BONUS: make the source long enough to run off the end of the whole Record,\n// not just past the name field. That one the arena does catch, and the\n// difference between the two is the difference between a bug you find and a\n// bug you ship.\n',"solution":`// Solution to Module 06, Exercise 04: Overrunning A Buffer
//
// Task 1: nothing faults. admin is 0 before the copy and 79 after it. No
// error, no warning, exit code 0. The program is now wrong and does not know
// it, which is the single most important thing in this module.
//
// Task 2: the dump is
//
//   0010  48 45 4c 4c  4f 00 00 00      |HELLO...|
//         ^^^^^^^^^^^                   name: u8[4]
//                      ^^^^^^^^^^^      admin: i32 = 79
//
// "HELLO" is H E L L O plus a terminator, six bytes. name holds four of them
// (48 45 4c 4c, "HELL"). The O, hex 4f, decimal 79, lands at offset 4, which
// layout() says is the first byte of admin. The terminator lands at offset 5,
// also inside admin. So admin, an i32 that was 0, is now 79: the letter O,
// sitting in the low byte, little-endian.
//
// Task 3: the arena tracks blocks, not fields. The whole Record is one
// 8-byte garrison, and every byte strcpy wrote, offsets 0 through 5, was
// inside it. Nothing was violated at the level the arena polices. This is the
// same rule Module 05 Exercise 02 ran into, and it is not a limitation of
// crunch-c: it is what C's own allocator knows. malloc hands out blocks. The
// field structure is a fiction the compiler maintains and nothing enforces at
// runtime.
//
// Task 4: an attacker who controls the source string controls admin. Six
// characters of input and the sixth one is a privilege flag. They do not need
// to find a crash, guess an address, or defeat any mitigation: they need to
// type a name that is too long. This is the shape of a large fraction of the
// CVEs of the last thirty years, and the reason "just be careful with
// strcpy" was never a workable answer.

floorplan Record {
    name: u8[4]
    admin: i32
}

fn strcpy(dst, src) {
    i = 0
    while src[i] != 0 {
        dst[i] = src[i]
        i = i + 1
    }
    dst[i] = 0
    return i
}

// A bounded copy: one that checks the destination's size, which means being
// TOLD the size, because a pine cannot report it.
//
// Watch what this actually does when the source is too long. It does not
// refuse the whole copy - it writes as much as fits, terminates it, and
// returns -1. The destination ends up holding a valid but truncated string.
// That is the correct behaviour and it is still a trap: if the caller ignores
// the return value, the program silently continues with the wrong name.
fn strcpy_max(dst, src, limit) {
    i = 0
    while src[i] != 0 {
        if i + 1 >= limit {
            return 0 - 1
        }
        dst[i] = src[i]
        i = i + 1
    }
    dst[i] = 0
    return i
}

src = garrison(6)
src[0] = 72   // H
src[1] = 69   // E
src[2] = 76   // L
src[3] = 76   // L
src[4] = 79   // O
src[5] = 0

layout(Record)

// Tasks 1 and 2: the unchecked copy.
rec = garrison(Record)
rec.admin = i32(0)
print(f"admin before the copy: {rec.admin}")
strcpy(rec, src)
print("")
bathysphere(rec)
print(f"admin after the copy:  {rec.admin}")
print("no fault, no warning, exit code 0 - and admin is now the letter O")
scorch(rec)

// The same copy, bounded by the size of the field.
print("")
safe = garrison(Record)
safe.admin = i32(0)
written = strcpy_max(safe, src, 4)
bathysphere(safe)
print(f"strcpy_max returned {written} (-1 means truncated), admin = {safe.admin}")
print("admin is intact - but look at name: HEL and a terminator.")
print("the copy did not refuse, it stopped. a partial string was written and")
print("the ONLY signal that anything was lost is the return value.")
scorch(safe)

// BONUS: run off the end of the whole Record, not just past the field.
//
// This is the contrast that matters. Overrunning the FIELD is silent;
// overrunning the BLOCK is caught. In C neither is caught, and the first one
// is the one that ships.
long = garrison(12)
i = 0
while i < 11 {
    long[i] = 65 + i
    i = i + 1
}
long[11] = 0

scorch(src)

print("")
print("now copying 12 bytes into an 8-byte Record...")
overflow = garrison(Record)
strcpy(overflow, long)
print("unreachable")
`}];
