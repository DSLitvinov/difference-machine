package commands

import (
	"fmt"
)

// Lol outputs a fun verse
func Lol(args []string) error {
	if len(args) > 0 {
		return fmt.Errorf("usage: lol")
	}
	verse := `Замученный дорогой
Я выбился из сил
И в доме лесника я
Ночлега попросил
С улыбкой добродушной
Старик меня пустил
И жестом дружелюбным
На ужин пригласил
(Хэй!)`

	fmt.Println(verse)
	return nil
}
