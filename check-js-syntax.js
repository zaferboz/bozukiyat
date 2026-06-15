try {
  eval(WScript.StdIn.ReadAll());
  WScript.Echo('Syntax OK');
} catch (e) {
  WScript.Echo('Syntax Error: ' + e.message);
  WScript.Quit(1);
}
