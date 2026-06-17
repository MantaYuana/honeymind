from threat_scorer import command_weight

def test_known_dangerous_command():
    assert command_weight("nmap -sV 10.0.0.1") == 15

def test_known_low_command():
    assert command_weight("ls -la") == 1

def test_unknown_command_defaults_to_two():
    assert command_weight("foobar") == 2

def test_empty_command_is_zero():
    assert command_weight("") == 0
