Chciałbym stworzyc funkcje pomocznie w @army.utils.ts oraz tak skonstruować "initializeVillageInformation" w @crawler-orchestrator.service.ts  żeby
1) bot sprawdził wojska
2) bot sprawdził ataki na wioski koczownice oraz barbarzynskie (sprawdzenie na podstawie koordynatów) z tabelki:
```
<table class="vis" style="width:100%">
        <tbody><tr>
            <th width="52%">
                Własne rozkazy
                <span class="commands-command-count">
               (10)
            </span>
            </th>
            <th width="33%">Na miejscu</th>
            <th width="15%">Dotrze za</th>
        </tr>

                                                    <tr class="command-row">
                <td>
                    <span class="quickedit-out" data-id="2137448944" data-ignore-icons="1">
                    <span class="quickedit-content">
                        <a href="/game.php?village=2197&amp;screen=info_command&amp;id=2137448944&amp;type=own">
                            <span class="icon-container">
                                <span class="command_hover_details" data-command-id="2137448944" data-icon-hint="Atak farmiący (powracający)" data-command-type="return" data-title="">
	<img src="https://dspl.innogamescdn.com/asset/75cb846c/graphic/command/return_farm.webp" alt="">
</span>
                            </span>
                            <span class="quickedit-label">
                                 Powrót z Wioska barbarzyńska (542|489) K45 
                            </span>
                        </a>

                                                    <a class="rename-icon" href="#" data-title="Zmień nazwę"></a>
                                            </span>
                </span>
                </td>

                                                        <td>dzisiaj o 11:48:41:<span class="grey small">000</span></td>
                
                <td>
                    <span class="" data-endtime="1751104121">0:03:57</span>
                                    </td>
            </tr>
                                            <tr class="command-row">
                <td>
                    <span class="quickedit-out" data-id="396715711" data-ignore-icons="1">
                    <span class="quickedit-content">
                        <a href="/game.php?village=2197&amp;screen=info_command&amp;id=396715711&amp;type=own">
                            <span class="icon-container">
                                <span class="command_hover_details" data-command-id="396715711" data-icon-hint="Atak farmiący" data-command-type="attack" data-title="">
	<img src="https://dspl.innogamescdn.com/asset/75cb846c/graphic/command/farm.webp" alt="">
</span>
                            </span>
                            <span class="quickedit-label">
                                 Atak na Wioska barbarzyńska (544|489) K45 
                            </span>
                        </a>

                                                    <a class="rename-icon" href="#" data-title="Zmień nazwę"></a>
                                            </span>
                </span>
                </td>

                                                        <td>dzisiaj o 11:48:53:<span class="grey small">838</span></td>
                
                <td>
                    <span class="" data-endtime="1751104133">0:04:09</span>
                                    </td>
            </tr>
                                            <tr class="command-row">
                <td>
                    <span class="quickedit-out" data-id="892357091" data-ignore-icons="1">
                    <span class="quickedit-content">
                        <a href="/game.php?village=2197&amp;screen=info_command&amp;id=892357091&amp;type=own">
                            <span class="icon-container">
                                <span class="command_hover_details" data-command-id="892357091" data-icon-hint="Atak farmiący" data-command-type="attack" data-title="">
	<img src="https://dspl.innogamescdn.com/asset/75cb846c/graphic/command/farm.webp" alt="">
</span>
                            </span>
                            <span class="quickedit-label">
                                 Atak na Wioska barbarzyńska (541|485) K45 
                            </span>
                        </a>

                                                    <a class="rename-icon" href="#" data-title="Zmień nazwę"></a>
                                            </span>
                </span>
                </td>

                                                        <td>dzisiaj o 11:51:27:<span class="grey small">711</span></td>
                
                <td>
                    <span class="" data-endtime="1751104287">0:06:43</span>
                                    </td>
            </tr>
                                            <tr class="command-row">
                <td>
                    <span class="quickedit-out" data-id="1306856498" data-ignore-icons="1">
                    <span class="quickedit-content">
                        <a href="/game.php?village=2197&amp;screen=info_command&amp;id=1306856498&amp;type=own">
                            <span class="icon-container">
                                <span class="command_hover_details" data-command-id="1306856498" data-icon-hint="Atak farmiący (powracający)" data-command-type="return" data-title="">
	<img src="https://dspl.innogamescdn.com/asset/75cb846c/graphic/command/return_farm.webp" alt="">
</span>
                            </span>
                            <span class="quickedit-label">
                                 Powrót z Wioska barbarzyńska (541|487) K45 
                            </span>
                        </a>

                                                    <a class="rename-icon" href="#" data-title="Zmień nazwę"></a>
                                            </span>
                </span>
                </td>

                                                        <td>dzisiaj o 11:59:06:<span class="grey small">000</span></td>
                
                <td>
                    <span class="" data-endtime="1751104746">0:14:22</span>
                                    </td>
            </tr>
                                            <tr class="command-row">
                <td>
                    <span class="quickedit-out" data-id="1298129134" data-ignore-icons="1">
                    <span class="quickedit-content">
                        <a href="/game.php?village=2197&amp;screen=info_command&amp;id=1298129134&amp;type=own">
                            <span class="icon-container">
                                <span class="command_hover_details" data-command-id="1298129134" data-icon-hint="Atak farmiący" data-command-type="attack" data-title="">
	<img src="https://dspl.innogamescdn.com/asset/75cb846c/graphic/command/farm.webp" alt="">
</span>
                            </span>
                            <span class="quickedit-label">
                                 Atak na Osada koczowników (536|491) K45 
                            </span>
                        </a>

                                                    <a class="rename-icon" href="#" data-title="Zmień nazwę"></a>
                                            </span>
                </span>
                </td>

                                                        <td>dzisiaj o 11:59:21:<span class="grey small">087</span></td>
                
                <td>
                    <span class="" data-endtime="1751104761">0:14:37</span>
                                    </td>
            </tr>
                                            <tr class="command-row">
                <td>
                    <span class="quickedit-out" data-id="383315896" data-ignore-icons="1">
                    <span class="quickedit-content">
                        <a href="/game.php?village=2197&amp;screen=info_command&amp;id=383315896&amp;type=own">
                            <span class="icon-container">
                                <span class="command_hover_details" data-command-id="383315896" data-icon-hint="Atak farmiący" data-command-type="attack" data-title="">
	<img src="https://dspl.innogamescdn.com/asset/75cb846c/graphic/command/farm.webp" alt="">
</span>
                            </span>
                            <span class="quickedit-label">
                                 Atak na Wioska barbarzyńska (542|493) K45 
                            </span>
                        </a>

                                                    <a class="rename-icon" href="#" data-title="Zmień nazwę"></a>
                                            </span>
                </span>
                </td>

                                                        <td>dzisiaj o 11:59:26:<span class="grey small">139</span></td>
                
                <td>
                    <span class="" data-endtime="1751104766">0:14:42</span>
                                    </td>
            </tr>
                                            <tr class="command-row">
                <td>
                    <span class="quickedit-out" data-id="670577928" data-ignore-icons="1">
                    <span class="quickedit-content">
                        <a href="/game.php?village=2197&amp;screen=info_command&amp;id=670577928&amp;type=own">
                            <span class="icon-container">
                                <span class="command_hover_details" data-command-id="670577928" data-icon-hint="Atak farmiący" data-command-type="attack" data-title="">
	<img src="https://dspl.innogamescdn.com/asset/75cb846c/graphic/command/farm.webp" alt="">
</span>
                            </span>
                            <span class="quickedit-label">
                                 Atak na Osada koczowników (540|484) K45 
                            </span>
                        </a>

                                                    <a class="rename-icon" href="#" data-title="Zmień nazwę"></a>
                                            </span>
                </span>
                </td>

                                                        <td>dzisiaj o 12:10:46:<span class="grey small">938</span></td>
                
                <td>
                    <span class="" data-endtime="1751105446">0:26:02</span>
                                    </td>
            </tr>
                                            <tr class="command-row">
                <td>
                    <span class="quickedit-out" data-id="934056518" data-ignore-icons="1">
                    <span class="quickedit-content">
                        <a href="/game.php?village=2197&amp;screen=info_command&amp;id=934056518&amp;type=own">
                            <span class="icon-container">
                                <span class="command_hover_details" data-command-id="934056518" data-icon-hint="Atak farmiący" data-command-type="attack" data-title="">
	<img src="https://dspl.innogamescdn.com/asset/75cb846c/graphic/command/farm.webp" alt="">
</span>
                            </span>
                            <span class="quickedit-label">
                                 Atak na Wioska barbarzyńska (537|493) K45 
                            </span>
                        </a>

                                                    <a class="rename-icon" href="#" data-title="Zmień nazwę"></a>
                                            </span>
                </span>
                </td>

                                                        <td>dzisiaj o 12:10:56:<span class="grey small">092</span></td>
                
                <td>
                    <span class="" data-endtime="1751105456">0:26:12</span>
                                    </td>
            </tr>
                                            <tr class="command-row">
                <td>
                    <span class="quickedit-out" data-id="1864900201" data-ignore-icons="1">
                    <span class="quickedit-content">
                        <a href="/game.php?village=2197&amp;screen=info_command&amp;id=1864900201&amp;type=own">
                            <span class="icon-container">
                                <span class="command_hover_details" data-command-id="1864900201" data-icon-hint="Atak farmiący (powracający)" data-command-type="return" data-title="">
	<img src="https://dspl.innogamescdn.com/asset/75cb846c/graphic/command/return_farm.webp" alt="">
</span>
                            </span>
                            <span class="quickedit-label">
                                 Powrót z Osada koczowników (543|488) K45 
                            </span>
                        </a>

                                                    <a class="rename-icon" href="#" data-title="Zmień nazwę"></a>
                                            </span>
                </span>
                </td>

                                                        <td>dzisiaj o 12:39:57:<span class="grey small">000</span></td>
                
                <td>
                    <span class="" data-endtime="1751107197">0:55:13</span>
                                    </td>
            </tr>
                                            <tr class="command-row">
                <td>
                    <span class="quickedit-out" data-id="627101469" data-ignore-icons="1">
                    <span class="quickedit-content">
                        <a href="/game.php?village=2197&amp;screen=info_command&amp;id=627101469&amp;type=own">
                            <span class="icon-container">
                                <span class="command_hover_details" data-command-id="627101469" data-icon-hint="Atak farmiący (powracający)" data-command-type="return" data-title="">
	<img src="https://dspl.innogamescdn.com/asset/75cb846c/graphic/command/return_farm.webp" alt="">
</span>
                            </span>
                            <span class="quickedit-label">
                                 Powrót z Osada koczowników (542|486) K45 
                            </span>
                        </a>

                                                    <a class="rename-icon" href="#" data-title="Zmień nazwę"></a>
                                            </span>
                </span>
                </td>

                                                        <td>dzisiaj o 12:59:22:<span class="grey small">000</span></td>
                
                <td>
                    <span class="" data-endtime="1751108362">1:14:38</span>
                                    </td>
            </tr>
            </tbody></table>
``` ze strony "@https://pl216.plemiona.pl/game.php?village=2197&screen=place " 216 powinna byc zmienna, villateId tez.

następnie sprawdzić czy to jest "Powrót", czy "Atak". Obliczyć w jakim czasie dane wojsko wróci, to znaczy że jezeli jest "Atak" to trzeba dodać czas na powrót, czas powrotu wystarczy dodać z @barbarian-villages.json wyszukując na podstaiwe koordynatów odpowiedni obiekt i dodać czas "sword". Czemu dodać na sztywno czas "sword"? Bo ataki, które będą wykonywane są zawsze w postaci 2 jednostek "spear" oraz 2 jednostek "sword" - to jest funkcja do wysyłania małych wojsk do farmienia wiosek koczowniczych oraz barbarzyńskich na podstawie pliku @barbarian-villages.json .

3) Jak juz bedzie ustalone za ile dane wojsko wroci to mamy pelne dane, zeby potem cos robic z algorytmem. Chce pozniej uruchamiac funkcje co 30 minut, która będzie wysyłać wojsko do wioski, która była najdawniej atakowana