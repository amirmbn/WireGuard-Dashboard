(function () {
        
    let configuration_interval;
    let configuration_timeout = 0;
    let $progress_bar = $(".progress-bar");
    let bootstrapModalConfig = {
        keyboard: false,
        backdrop: 'static'
    };
    let addModal = new bootstrap.Modal(document.getElementById('add_modal'), bootstrapModalConfig);
    let deleteBulkModal = new bootstrap.Modal(document.getElementById('delete_bulk_modal'), bootstrapModalConfig);
    let ipModal = new bootstrap.Modal(document.getElementById('available_ip_modal'), bootstrapModalConfig);
    let qrcodeModal = new bootstrap.Modal(document.getElementById('qrcode_modal'), bootstrapModalConfig);
    let settingModal = new bootstrap.Modal(document.getElementById('setting_modal'), bootstrapModalConfig);
    let deleteModal = new bootstrap.Modal(document.getElementById('delete_modal'), bootstrapModalConfig);
    $("[data-toggle='tooltip']").tooltip();
    $("[data-toggle='popover']").popover();

        function configurationAlert(response) {
        if (response.listen_port === "" && response.status === "stopped") {
            let configAlert = document.createElement("div");
            configAlert.classList.add("alert");
            configAlert.classList.add("alert-warning");
            configAlert.setAttribute("role", "alert");
            configAlert.innerHTML = 'Peer QR Code and configuration file download required a specified <strong>Listen Port</strong>.';
            document.querySelector("#config_info_alert").appendChild(configAlert);
        }
        if (response.conf_address === "N/A") {
            let configAlert = document.createElement("div");
            configAlert.classList.add("alert");
            configAlert.classList.add("alert-warning");
            configAlert.setAttribute("role", "alert");
            configAlert.innerHTML = 'Configuration <strong>Address</strong> need to be specified to have peers connect to it.';
            document.querySelector("#config_info_alert").appendChild(configAlert);
        }
    }

        function configurationHeader(response) {
        let $conf_status_btn = document.getElementById("conf_status_btn");
        if (response.checked === "checked") {
            $conf_status_btn.innerHTML = `<a href="#" id="${response.name}" ${response.checked} class="switch">
                <label class="wg-switch">
                    <input type="checkbox" checked>
                    <span class="wg-slider wg-round"></span>
                </label>
            </a>`;
        } else {
            $conf_status_btn.innerHTML = `<a href="#" id="${response.name}" ${response.checked} class="switch">
                <label class="wg-switch">
                    <input type="checkbox">
                    <span class="wg-slider wg-round"></span>
                </label>
            </a>`;
        }
        $conf_status_btn.classList.remove("info_loading");
        document.querySelectorAll("#sort_by_dropdown option").forEach(ele => ele.removeAttribute("selected"));
        document.querySelector(`#sort_by_dropdown option[value="${response.sort_tag}"]`).setAttribute("selected", "selected");
        document.querySelectorAll(".interval-btn-group button").forEach(ele => ele.classList.remove("active"));
        document.querySelector(`button[data-refresh-interval="${response.dashboard_refresh_interval}"]`).classList.add("active");
        document.querySelectorAll(".display-btn-group button").forEach(ele => ele.classList.remove("active"));
        document.querySelector(`button[data-display-mode="${response.peer_display_mode}"]`).classList.add("active");
        document.querySelector("#conf_status").innerHTML = `<span class="dot dot-${response.status}"></span>${response.status}`;
        document.querySelector("#conf_connected_peers").innerHTML = response.running_peer;
        document.querySelector("#conf_total_data_usage").innerHTML = `${response.total_data_usage[0]} GB`;
        document.querySelector("#conf_total_data_received").innerHTML = `${response.total_data_usage[2]} GB`;
        document.querySelector("#conf_total_data_sent").innerHTML = `${response.total_data_usage[1]} GB`;
        document.querySelector("#conf_public_key").innerHTML = response.public_key;
        document.querySelector("#conf_listen_port").innerHTML = response.listen_port === "" ? "N/A" : response.listen_port;
        document.querySelector("#conf_address").innerHTML = response.conf_address;
        document.querySelectorAll(".info h6").forEach(ele => ele.classList.remove("info_loading"));
    }

        function configurationPeers(response) {
        let result = "";
        if (response.peer_data.length === 0) {
            document.querySelector(".peer_list").innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 1.5rem 0"><h3 class="text-muted" style="margin:0">هیچ کاربری وجود ندارد</h3></td></tr>`;
        } else {
            response.peer_data.forEach(function (peer) {
                let used_receive = roundN(peer.total_receive + peer.cumu_receive, 4);
                let used_sent = roundN(peer.total_sent + peer.cumu_sent, 4);
                let used_total = roundN(used_receive + used_sent, 4);
                let bandwidth_gb = peer.bandwidth ? roundN(peer.bandwidth / (1024 * 1024 * 1024), 4) : 0;
                let unlimited = !bandwidth_gb || bandwidth_gb <= 0;
                let percent = unlimited ? 0 : Math.min(100, (used_total / bandwidth_gb) * 100);
                let remaining_gb = unlimited ? null : roundN(bandwidth_gb - used_total, 4);
                let bar_color = percent >= 90 ? "#dc3545" : (percent >= 70 ? "#ffc107" : "#6f42c1");

                let display_name = peer.name === "" ? "Untitled" : peer.name;

                let expiry_html = "بی‌نهایت";
                if (peer.ends_at) {
                    let d = new Date(peer.ends_at);
                    try {
                        expiry_html = new persianDate(d).format("YYYY/MM/DD HH:mm");
                    } catch (e) {
                        expiry_html = d.toLocaleString();
                    }
                    if (Date.now() > d.getTime()) {
                        expiry_html = '<span class="text-danger">' + expiry_html + '</span>';
                    }
                }

                let traffic_html =
                    '<div class="traffic-cell">' +
                        '<div class="traffic-numbers">' +
                            '<span class="text-primary"><i class="bi bi-arrow-down-right"></i> ' + used_receive + ' GB</span>' +
                            '<span class="text-success"><i class="bi bi-arrow-up-right"></i> ' + used_sent + ' GB</span>' +
                        '</div>' +
                        '<div class="traffic-progress">' +
                            '<div class="traffic-progress-fill" style="width:' + (unlimited ? 100 : percent) + '%; background-color:' + (unlimited ? '#adb5bd' : bar_color) + '"></div>' +
                        '</div>' +
                        '<div class="traffic-total text-muted">' + used_total + ' GB' + (unlimited ? ' / بی‌نهایت' : ' / ' + bandwidth_gb + ' GB') + '</div>' +
                    '</div>';

                let remaining_html = unlimited
                    ? '<span class="text-muted">بی‌نهایت</span>'
                    : (remaining_gb > 0
                        ? '<span class="text-success">' + remaining_gb + ' GB</span>'
                        : '<span class="text-danger">۰ GB</span>');

                let peer_control = '<div class="button-group" style="display:flex; justify-content:center">' +
                    '<button type="button" class="btn btn-outline-primary btn-setting-peer btn-control" id="' + peer.id + '" data-toggle="modal"><i class="bi bi-gear-fill" data-toggle="tooltip" data-placement="bottom" title="تنظیمات کاربر"></i></button> ' +
                    '<button type="button" class="btn btn-outline-danger btn-delete-peer btn-control" id="' + peer.id + '" data-toggle="modal"><i class="bi bi-x-circle-fill" data-toggle="tooltip" data-placement="bottom" title="حذف کاربر"></i></button>';
                if (peer.private_key !== "") {
                    peer_control += '<button type="button" class="btn btn-outline-success btn-qrcode-peer btn-control" data-imgsrc="/qrcode/' + response.name + '?id=' + encodeURIComponent(peer.id) + '"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" style="width: 16px;" fill="#28a745"><path d="M3 11h8V3H3v8zm2-6h4v4H5V5zM3 21h8v-8H3v8zm2-6h4v4H5v-4zM13 3v8h8V3h-8zm6 6h-4V5h4v4zM13 13h2v2h-2zM15 15h2v2h-2zM13 17h2v2h-2zM17 17h2v2h-2zM19 19h2v2h-2zM15 19h2v2h-2zM17 13h2v2h-2zM19 15h2v2h-2z"/></svg></button>' +
                        '<a href="/download/' + response.name + '?id=' + encodeURIComponent(peer.id) + '" class="btn btn-outline-info btn-download-peer btn-control"><i class="bi bi-download" data-toggle="tooltip" data-placement="bottom" title="دانلود کاربر"></i></a>';
                }
                peer_control += '</div>';

                let html = '<tr class="peer-row" data-id="' + peer.id + '">' +
                    '<td>' +
                        '<div class="peer-name-cell">' +
                            '<span class="fw-bold">' + display_name + '</span>' +
                            '<samp class="text-muted peer-ip">' + peer.allowed_ip + '</samp>' +
                        '</div>' +
                    '</td>' +
                    '<td>' +
                        '<span class="dot dot-' + peer.status + '" data-toggle="tooltip" data-placement="top" title="' + (peer.status === 'running' ? 'آنلاین' : 'آفلاین') + '"></span>' +
                        '<span class="' + (peer.status === 'running' ? 'text-success' : 'text-muted') + ' online-text">' + (peer.status === 'running' ? 'آنلاین' : 'آفلاین') + '</span>' +
                        '<br>' +
                        '<span class="badge ' + (peer.end_active ? 'badge-active' : 'badge-inactive') + '">' + (peer.end_active ? 'فعال' : 'غیرفعال') + '</span>' +
                    '</td>' +
                    '<td>' + traffic_html + '</td>' +
                    '<td>' + remaining_html + '</td>' +
                    '<td>' + expiry_html + '</td>' +
                    '<td>' + peer_control + '</td>' +
                    '</tr>';
                result += html;
            });
            document.querySelector(".peer_list").innerHTML = result;
            if (response.dashboard_refresh_interval !== configuration_timeout) {
                configuration_timeout = response.dashboard_refresh_interval;
                removeConfigurationInterval();
                setConfigurationInterval();
            }
        }
    }

     function addPeersByBulk() {
    const $new_add_amount = $("#new_add_amount");
    const $add_peer = document.getElementById("add_peer");
    $add_peer.setAttribute("disabled", "disabled");
    $add_peer.innerHTML = `Adding ${$new_add_amount.val()} peers...`;

    const $new_add_DNS = $("#new_add_DNS");
    $new_add_DNS.val(window.configurations.cleanIp($new_add_DNS.val()));
    const $new_add_endpoint_allowed_ip = $("#new_add_endpoint_allowed_ip");
    $new_add_endpoint_allowed_ip.val(window.configurations.cleanIp($new_add_endpoint_allowed_ip.val()));
    const $new_add_MTU = $("#new_add_MTU");
    const $new_add_keep_alive = $("#new_add_keep_alive");
    const $enable_preshare_key = $("#enable_preshare_key");
    const data_list = [$new_add_DNS, $new_add_endpoint_allowed_ip, $new_add_MTU, $new_add_keep_alive];

    if ($new_add_amount.val() > 0 && !$new_add_amount.hasClass("is-invalid")) {
        if ($new_add_DNS.val() !== "" && $new_add_endpoint_allowed_ip.val() !== "") {
            const conf = $add_peer.getAttribute('conf_id');
            const keys = [];
            for (let i = 0; i < $new_add_amount.val(); i++) {
                keys.push(window.wireguard.generateKeypair());
            }

            $.ajax({
                method: "POST",
                url: "/add_peer_bulk/" + conf,
                headers: {
                    "Content-Type": "application/json"
                },
                data: JSON.stringify({
                    "DNS": $new_add_DNS.val(),
                    "endpoint_allowed_ip": $new_add_endpoint_allowed_ip.val(),
                    "MTU": $new_add_MTU.val(),
                    "keep_alive": $new_add_keep_alive.val(),
                    "enable_preshared_key": $enable_preshare_key.prop("checked"),
                    "keys": keys,
                    "amount": $new_add_amount.val()
                }),
                success: function (response) {
                    if (response !== "true") {
                        $("#add_peer_alert").html(response).removeClass("d-none");
                        data_list.forEach((ele) => ele.prop("disabled", false));
                        $add_peer.removeAttribute("disabled");
                            $add_peer.innerHTML = "ذخیره کردن";
                    } else {
                        window.configurations.loadPeers("");
                        data_list.forEach((ele) => ele.prop("disabled", false));
                        $("#add_peer_form").trigger("reset");
                        $add_peer.removeAttribute("disabled");
                            $add_peer.innerHTML = "ذخیره کردن";
                            window.configurations.showToast($new_add_amount.val()+" کاربر با موفقیت اضافه شد!");
                        window.configurations.addModal().toggle();
                    }
                }
            });
        } else {
                $("#add_peer_alert").html("لطفا فیلدهای الزامی را تکمیل نمایید.").removeClass("d-none");
            $add_peer.removeAttribute("disabled");
                $add_peer.innerHTML = "اضافه کردن";
        }
    } else {
        $add_peer.removeAttribute("disabled");
            $add_peer.innerHTML = "اضافه کردن";
    }
}

        function deletePeers(config, peer_ids) {
        $.ajax({
            method: "POST",
            url: "/remove_peer/" + config,
            headers: {
                "Content-Type": "application/json"
            },
            data: JSON.stringify({"action": "delete", "peer_ids": peer_ids}),
            success: function (response) {
                if (response !== "true") {
                    if (window.configurations.deleteModal()._isShown) {
                        $("#remove_peer_alert").html(response + $("#add_peer_alert").html())
                            .removeClass("d-none");
                        $("#delete_peer").removeAttr("disabled").html("Delete");
                    }
                    if (window.configurations.deleteBulkModal()._isShown) {
                        let $bulk_remove_peer_alert = $("#bulk_remove_peer_alert");
                        $bulk_remove_peer_alert.html(response + $bulk_remove_peer_alert.html())
                            .removeClass("d-none");
                        $("#confirm_delete_bulk_peers").removeAttr("disabled").html("Delete");
                    }
                } else {
                    if (window.configurations.deleteModal()._isShown) {
                        window.configurations.deleteModal().toggle();
                    }
                    if (window.configurations.deleteBulkModal()._isShown) {
                        $("#confirm_delete_bulk_peers").removeAttr("disabled").html("Delete");
                        $("#selected_peer_list").html('');
                        $(".delete-bulk-peer-item.active").removeClass('active');
                        window.configurations.deleteBulkModal().toggle();
                    }
                    window.configurations.loadPeers($('#search_peer_textbox').val());
                    $('#alertToast').toast('show');
                    $('#alertToast .toast-body').html("کاربر حذف شد!");
                    $("#delete_peer").removeAttr("disabled").html("Delete");
                }
            }
        });
    }

        function noResponding() {
        document.querySelectorAll(".no-response").forEach(ele => ele.classList.add("active"));
        setTimeout(function () {
            document.querySelectorAll(".no-response").forEach(ele => ele.classList.add("show"));
            document.querySelector("#right_body").classList.add("no-responding");
            document.querySelector(".navbar").classList.add("no-responding");
        }, 10);
    }

        function removeNoResponding() {
        document.querySelectorAll(".no-response").forEach(ele => ele.classList.remove("show"));
        document.querySelector("#right_body").classList.remove("no-responding");
        document.querySelector(".navbar").classList.remove("no-responding");
        setTimeout(function () {
            document.querySelectorAll(".no-response").forEach(ele => ele.classList.remove("active"));
        }, 1010);
    }

        function setConfigurationInterval() {
        configuration_interval = setInterval(function () {
            loadPeers($('#search_peer_textbox').val());
        }, configuration_timeout);
    }

        function removeConfigurationInterval() {
        clearInterval(configuration_interval);
    }

        function startProgressBar() {
        $progress_bar.css("width", "0%")
            .css("opacity", "100")
            .css("background", "rgb(255,69,69)")
            .css("background",
                "linear-gradient(145deg, rgba(255,69,69,1) 0%, rgba(0,115,186,1) 100%)")
            .css("width", "25%");
        setTimeout(function () {
            stillLoadingProgressBar();
        }, 300);
    }

        function stillLoadingProgressBar() {
        $progress_bar.css("transition", "3s ease-in-out").css("width", "75%");
    }

        function endProgressBar() {
        $progress_bar.css("transition", "0.3s ease-in-out").css("width", "100%");
        setTimeout(function () {
            $progress_bar.css("opacity", "0");
        }, 250);
    }

        function roundN(value, digits) {
        let tenToN = 10 ** digits;
        return (Math.round(value * tenToN)) / tenToN;
    }

        let d1 = new Date();
    let time = 0;
    let count = 0;

    function loadPeers(searchString) {
        startProgressBar();
        d1 = new Date();
        $.ajax({
            method: "GET",
            url: `/get_config/${conf_name}?search=${encodeURIComponent(searchString)}`,
            headers: {"Content-Type": "application/json"}
        }).done(function (response) {
            removeNoResponding();
            peers = response.peer_data;
            configurationAlert(response);
            configurationHeader(response);
            configurationPeers(response);
            $(".dot.dot-running").attr("title","کاربر متصل است").tooltip();
            $(".dot.dot-stopped").attr("title","کاربر متصل نیست").tooltip();
            $("i[data-toggle='tooltip']").tooltip();
            endProgressBar();
            let d2 = new Date();
            let seconds = (d2 - d1);
            time += seconds;
            count += 1;
            console.log(`Average ${time / count}ms`);
            $("#peer_loading_time").html(`Peer Loading Time: ${seconds}ms`);
        }).fail(function () {
            noResponding();
        });
    }

        function generate_key() {
        let keys = window.wireguard.generateKeypair();
        document.querySelector("#private_key").value = keys.privateKey;
        document.querySelector("#public_key").value = keys.publicKey;
        document.querySelector("#add_peer_alert").classList.add("d-none");
        document.querySelector("#re_generate_key i").classList.remove("rotating");
        document.querySelector("#enable_preshare_key").value = keys.presharedKey;
    }

        function showToast(msg) {
        $('#alertToast').toast('show');
        $('#alertToast .toast-body').html(msg);
    }

        function updateRefreshInterval(res, interval) {
        if (res === "true") {
            configuration_timeout = interval;
            removeConfigurationInterval();
            setConfigurationInterval();
            showToast("بروزرسانی کاربران هر "+Math.round(interval/1000)+" ثانیه");
        } else {
            $(".interval-btn-group button").removeClass("active");
            $('.interval-btn-group button[data-refresh-interval="' + configuration_timeout + '"]').addClass("active");
            showToast("Refresh Interval set unsuccessful");
        }
    }

        function cleanIp(val) {
        let clean_ip = val.split(',');
        for (let i = 0; i < clean_ip.length; i++) {
            clean_ip[i] = clean_ip[i].trim(' ');
        }
        return clean_ip.filter(Boolean).join(",");
    }

        function trigger_ip(ip) {
        let $ip_ele = document.querySelector(`.available-ip-item[data-ip='${ip}']`);
        if ($ip_ele) {
            if ($ip_ele.classList.contains("active")) {
                $ip_ele.classList.remove("active");
                document.querySelector(`#selected_ip_list .badge[data-ip='${ip}']`).remove();
            } else {
                $ip_ele.classList.add("active");
                document.querySelector("#selected_ip_list").innerHTML += `<span class="badge badge-primary available-ip-badge" style="cursor: pointer" data-ip="${ip}">${ip}</span>`;
            }
        }
    }

        function download_one_config(conf) {
        let link = document.createElement('a');
        link.download = conf.filename;
        let blob = new Blob([conf.content], {type: 'text/conf'});
        link.href = window.URL.createObjectURL(blob);
        link.click();
    }

        function toggleBulkIP(element) {
        let $selected_peer_list = $("#selected_peer_list");
        let id = element.data("id");
        let name = element.data("name") === "" ? "Untitled Peer" : element.data("name");
        if (element.hasClass("active")) {
            element.removeClass("active");
            $("#selected_peer_list .badge[data-id='" + id + "']").remove();
        } else {
            element.addClass("active");
            $selected_peer_list.append('<span class="badge badge-danger delete-peer-bulk-badge" style="cursor: pointer; text-overflow: ellipsis; max-width: 100%; overflow-x: hidden" data-id="' + id + '">' + name + ' - ' + id + '</span>');
        }
    }

        function copyToClipboard(element) {
        let $temp = $("<input>");
        $body.append($temp);
        $temp.val($(element).text()).trigger("select");
        document.execCommand("copy");
        $temp.remove();
    }

    function getAvailableIps() {
  $.ajax({
    url: `/available_ips/${$add_peer.getAttribute("conf_id")}`,
    method: "GET",
  }).done(function (res) {
    const available_ips = res;
    const $list_group = $("#available_ip_modal .modal-body .list-group");
    $list_group.empty();
    $("#allowed_ips").val(available_ips[0]);

    available_ips.forEach((ip) => {
      const $ipItem = $("<a>", {
        class: "list-group-item list-group-item-action available-ip-item",
        style: "cursor: pointer",
        "data-ip": ip,
        text: ip,
      });
      $list_group.append($ipItem);
    });
  });
}
    window.configurations = {
        addModal: () => {
            return addModal;
        },
        deleteBulkModal: () => {
            return deleteBulkModal;
        },
        deleteModal: () => {
            return deleteModal;
        },
        ipModal: () => {
            return ipModal;
        },
        qrcodeModal: () => {
            return qrcodeModal;
        },
        settingModal: () => {
            return settingModal;
        },
        loadPeers: (searchString) => {
            loadPeers(searchString);
        },
        addPeersByBulk: () => {
            addPeersByBulk();
        },
        deletePeers: (config, peers_ids) => {
            deletePeers(config, peers_ids);
        },
        getAvailableIps: () => {
            getAvailableIps();
        },
        generateKeyPair: () => {
            generate_key();
        },
        showToast: (message) => {
            showToast(message);
        },
        updateRefreshInterval: (res, interval) => {
            updateRefreshInterval(res, interval);
        },
        copyToClipboard: (element) => {
            copyToClipboard(element);
        },
        toggleDeleteByBulkIP: (element) => {
            toggleBulkIP(element);
        },
        downloadOneConfig: (conf) => {
            download_one_config(conf);
        },
        triggerIp: (ip) => {
            trigger_ip(ip);
        },
        cleanIp: (val) => {
            return cleanIp(val);
        },
        startProgressBar: () => {
            startProgressBar();
        },
        stillLoadingProgressBar: () => {
            stillLoadingProgressBar();
        },
        endProgressBar: () => {
            endProgressBar();
        }
    };
})();

let $body = $("body");
let available_ips = [];
let $add_peer = document.getElementById("save_peer");

document.querySelector(".add_btn").addEventListener("click", () => {
    window.configurations.addModal().toggle();
});

document.querySelector(".info").addEventListener("click", (event) => {
    let selector = document.querySelector(".switch");
    if (selector.contains(event.target)) {
        selector.style.display = "none";
        document.querySelector('div[role=status]').style.display = "inline-block";
        location.replace(`/switch/${selector.getAttribute("id")}`);
    }
});

document.querySelector("#private_key").addEventListener("change", (event) => {
    let publicKey = document.querySelector("#public_key");
    if (event.target.value.length === 44) {
        publicKey.value = window.wireguard.generatePublicKey(event.target.value);
        publicKey.setAttribute("disabled", "disabled");
    } else {
        publicKey.attributes.removeNamedItem("disabled");
        publicKey.value = "";
    }
});

$('#add_modal').on('show.bs.modal', function () {
    window.configurations.generateKeyPair();
    window.configurations.getAvailableIps();
}).on('hide.bs.modal', function () {
    $("#allowed_ips_indicator").html('');
});

$("#re_generate_key").on("click", function () {
    $("#public_key").attr("disabled", "disabled");
    $("#re_generate_key i").addClass("rotating");
    window.configurations.generateKeyPair();
});

$("#allowed_ips").on("keyup", function () {
    let s = window.configurations.cleanIp($(this).val());
    s = s.split(",");
    if (available_ips.includes(s[s.length - 1])) {
        $("#allowed_ips_indicator").removeClass().addClass("text-success")
            .html('<i class="bi bi-check-circle-fill"></i>');
    } else {
        $("#allowed_ips_indicator").removeClass().addClass("text-warning")
            .html('<i class="bi bi-exclamation-circle-fill"></i>');
    }
});

$("#peer_name_textbox").on("keyup", function () {
    $(".peer_name").html($(this).val());
});

$add_peer.addEventListener("click", function () {
    let $bulk_add = $("#bulk_add");
    if ($bulk_add.prop("checked")) {
        if (!$("#new_add_amount").hasClass("is-invalid")) {
            window.configurations.addPeersByBulk();
        }
    } else {
        let $public_key = $("#public_key");
        let $private_key = $("#private_key");
        let $allowed_ips = $("#allowed_ips");
        $allowed_ips.val(window.configurations.cleanIp($allowed_ips.val()));
        let $new_add_DNS = $("#new_add_DNS");
        $new_add_DNS.val(window.configurations.cleanIp($new_add_DNS.val()));
        let $new_add_endpoint_allowed_ip = $("#new_add_endpoint_allowed_ip");
        $new_add_endpoint_allowed_ip.val(window.configurations.cleanIp($new_add_endpoint_allowed_ip.val()));
        let $new_add_name = $("#new_add_name");
        let $new_peer_bandwidth = $("#new_peer_bandwidth");
        let $new_peer_end = $("#new_peer_end");
        let $new_add_MTU = $("#new_add_MTU");
        let $new_add_keep_alive = $("#new_add_keep_alive");
        let $enable_preshare_key = $("#enable_preshare_key");
        $add_peer.setAttribute("disabled", "disabled");
        $add_peer.innerHTML = "اضافه کردن...";
        if ($allowed_ips.val() !== "" && $public_key.val() !== "" && $new_add_DNS.val() !== "" && $new_add_endpoint_allowed_ip.val() !== "") {
            let conf = $add_peer.getAttribute('conf_id');
            let data_list = [$private_key, $allowed_ips, $new_add_name, $new_peer_bandwidth, $new_peer_end, $new_add_DNS, $new_add_endpoint_allowed_ip, $new_add_MTU, $new_add_keep_alive];
            data_list.forEach((ele) => ele.attr("disabled", "disabled"));
            $.ajax({
                method: "POST",
                url: "/add_peer/" + conf,
                headers: {
                    "Content-Type": "application/json"
                },
                data: JSON.stringify({
                    "private_key": $private_key.val(),
                    "public_key": $public_key.val(),
                    "allowed_ips": $allowed_ips.val(),
                    "name": $new_add_name.val(),
                    "bandwidth": $new_peer_bandwidth.val(),
                    "ends_at": +new Date($new_peer_end.val()) / 1000,
                    "DNS": $new_add_DNS.val(),
                    "endpoint_allowed_ip": $new_add_endpoint_allowed_ip.val(),
                    "MTU": $new_add_MTU.val(),
                    "keep_alive": $new_add_keep_alive.val(),
                    "enable_preshared_key": $enable_preshare_key.prop("checked"),
                    "preshared_key": $enable_preshare_key.val()
                }),
                success: function (response) {
                    if (response !== "true") {
                        $("#add_peer_alert").html(response).removeClass("d-none");
                        data_list.forEach((ele) => ele.removeAttr("disabled"));
                        $add_peer.removeAttribute("disabled");
                        $add_peer.innerHTML = "ذخیره کردن";
                    } else {
                        window.configurations.loadPeers("");
                        data_list.forEach((ele) => ele.removeAttr("disabled"));
                        $("#add_peer_form").trigger("reset");
                        $add_peer.removeAttribute("disabled");
                        $add_peer.innerHTML = "ذخیره کردن";
                        window.configurations.showToast("کاربر اضافه شد!");
                        window.configurations.addModal().toggle();
                    }
                }
            });
        } else {
            $("#add_peer_alert").html("لطفا فیلدهای الزامی را تکمیل نمایید.").removeClass("d-none");
            $add_peer.removeAttribute("disabled");
            $add_peer.innerHTML = "اضافه کردن";
        }
    }
});

$("#new_add_amount").on("keyup", function () {
    let $bulk_amount_validation = $("#bulk_amount_validation");
        if ($(this).val().length > 0) {
        if (isNaN($(this).val())) {
            $(this).removeClass("is-valid").addClass("is-invalid");
            $bulk_amount_validation.html("Please enter a valid integer");
        } else if ($(this).val() > available_ips.length) {
            $(this).removeClass("is-valid").addClass("is-invalid");
            $bulk_amount_validation.html(`Cannot create more than ${available_ips.length} peers.`);
        } else if ($(this).val() < 1) {
            $(this).removeClass("is-valid").addClass("is-invalid");
            $bulk_amount_validation.html("Please enter at least 1 or more.");
        } else {
            $(this).removeClass("is-invalid").addClass("is-valid");
        }
    } else {
        $(this).removeClass("is-invalid").removeClass("is-valid");
    }
});

$("#bulk_add").on("change", function () {
    let hide = $(".non-bulk").find("input");
    let amount = $("#new_add_amount");
    if ($(this).prop("checked") === true) {
        for (let i = 0; i < hide.length; i++) {
            $(hide[i]).attr("disabled", "disabled");
        }
        amount.removeAttr("disabled");
    } else {
        for (let i = 0; i < hide.length; i++) {
            if ($(hide[i]).attr('id') !== "public_key") {
                $(hide[i]).removeAttr("disabled");
            }
        }
        amount.attr("disabled", "disabled");
    }
});

$("#available_ip_modal").on("show.bs.modal", () => {
    document.querySelector('#add_modal').classList.add("ip_modal_open");
}).on("hidden.bs.modal", () => {
    document.querySelector('#add_modal').classList.remove("ip_modal_open");
    let ips = [];
    let $selected_ip_list = document.querySelector("#selected_ip_list");
    for (let i = 0; i < $selected_ip_list.childElementCount; i++) {
        ips.push($selected_ip_list.children[i].dataset.ip);
    }
    ips.forEach((ele) => window.configurations.triggerIp(ele));
});

$body.on("click", ".available-ip-badge", function () {
    $(".available-ip-item[data-ip='" + $(this).data("ip") + "']").removeClass("active");
    $(this).remove();
});

$body.on("click", ".available-ip-item", function () {
    window.configurations.triggerIp($(this).data("ip"));
});

$("#search_available_ip").on("click", function () {
    window.configurations.ipModal().toggle();
    let $allowed_ips = document.querySelector("#allowed_ips");
    if ($allowed_ips.value.length > 0) {
        let s = $allowed_ips.value.split(",");
        for (let i = 0; i < s.length; i++) {
            s[i] = s[i].trim();
            window.configurations.triggerIp(s[i]);
        }
    }
}).tooltip();

$("#confirm_ip").on("click", () => {
    window.configurations.ipModal().toggle();
    let ips = [];
    let $selected_ip_list = $("#selected_ip_list");
    $selected_ip_list.children().each(function () {
        ips.push($(this).data("ip"));
    });
    $("#allowed_ips").val(ips.join(", "));
    ips.forEach((ele) => window.configurations.triggerIp(ele));
});

$body.on("click", ".btn-qrcode-peer", function () {
    let src = $(this).data('imgsrc');
    $.ajax({
        "url": src,
        "method": "GET"
    }).done(function (res) {
        $("#qrcode_img").attr('src', res);
        window.configurations.qrcodeModal().toggle();
    });
});

$body.on("click", ".btn-delete-peer", function () {
    let peer_id = $(this).attr("id");
    $("#delete_peer").attr("peer_id", peer_id);
    window.configurations.deleteModal().toggle();
});

$("#delete_peer").on("click", function () {
    $(this).attr("disabled", "disabled");
    $(this).html("Deleting...");
    let peer_id = $(this).attr("peer_id");
    let config = $(this).attr("conf_id");
    let peer_ids = [peer_id];
    window.configurations.deletePeers(config, peer_ids);
});

$body.on("click", ".btn-setting-peer", function () {
  window.configurations.startProgressBar();
  let peer_id = $(this).attr("id");
  $("#save_peer_setting").attr("peer_id", peer_id);
  $.ajax({
    method: "POST",
    url: "/get_peer_data/" + $("#setting_modal").attr("conf_id"),
    headers: {
      "Content-Type": "application/json"
    },
    data: JSON.stringify({ "id": peer_id }),
    success: handleSuccess
  });

  function handleSuccess(response) {
    let peer_name = response.name === "" ? "Untitled" : response.name;
    
    const formatDate = (date) => {
      const year = date.getFullYear();
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate();
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');

      return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    $("#setting_modal .peer_name").html(peer_name);
    $("#setting_modal #peer_name_textbox").val(response.name);

    const peerEndTextbox = $("#setting_modal #peer_end_textbox");
    peerEndTextbox.data("end-time", response.ends_at);
    const endTime = peerEndTextbox.data("end-time");
    peerEndTextbox.val(formatDate(new Date(endTime)));

    const bandwidthInBytes = parseFloat(response.bandwidth);
    const bandwidthInGB = (bandwidthInBytes / (1024 * 1024 * 1024)).toLocaleString(undefined, { minimumFractionDigits: 4 });
    $("#setting_modal #peer_bandwidth_textbox").val(bandwidthInGB);
    $("#setting_modal #peer_private_key_textbox").val(response.private_key);
    $("#setting_modal #peer_DNS_textbox").val(response.DNS);
    $("#setting_modal #peer_allowed_ip_textbox").val(response.allowed_ip);
    $("#setting_modal #peer_endpoint_allowed_ips").val(response.endpoint_allowed_ip);
    $("#setting_modal #peer_mtu").val(response.mtu);
    $("#setting_modal #peer_keep_alive").val(response.keep_alive);
    $("#setting_modal #peer_preshared_key_textbox").val(response.preshared_key);
    window.configurations.settingModal().toggle();
    window.configurations.endProgressBar();
  }
});

$('#setting_modal').on('hidden.bs.modal', function () {
    $("#setting_peer_alert").addClass("d-none");
});

$("#peer_private_key_textbox").on("change", function () {
    let $save_peer_setting = $("#save_peer_setting");
    if ($(this).val().length > 0) {
        $.ajax({
            "url": "/check_key_match/" + $save_peer_setting.attr("conf_id"),
            "method": "POST",
            "headers": {"Content-Type": "application/json"},
            "data": JSON.stringify({
                "private_key": $("#peer_private_key_textbox").val(),
                "public_key": $save_peer_setting.attr("peer_id")
            })
        }).done(function (res) {
            if (res.status === "failed") {
                $("#setting_peer_alert").html(res.status).removeClass("d-none");
            } else {
                $("#setting_peer_alert").addClass("d-none");
            }
        });
    }
});

$("#save_peer_setting").on("click", function () {
    $(this).attr("disabled", "disabled");
    $(this).html("Saving...");
    let $peer_DNS_textbox = $("#peer_DNS_textbox");
    let $peer_allowed_ip_textbox = $("#peer_allowed_ip_textbox");
    let $peer_endpoint_allowed_ips = $("#peer_endpoint_allowed_ips");
    let $peer_name_textbox = $("#peer_name_textbox");
    let $peer_bandwidth_textbox = $("#peer_bandwidth_textbox");
    let $peer_end_textbox = $("#peer_end_textbox");
    let $peer_private_key_textbox = $("#peer_private_key_textbox");
    let $peer_preshared_key_textbox = $("#peer_preshared_key_textbox");
    let $peer_mtu = $("#peer_mtu");
    let $peer_keep_alive = $("#peer_keep_alive");

    if ($peer_DNS_textbox.val() !== "" &&
        $peer_allowed_ip_textbox.val() !== "" && $peer_endpoint_allowed_ips.val() !== "") {
        let peer_id = $(this).attr("peer_id");
        let conf_id = $(this).attr("conf_id");
        let data_list = [$peer_name_textbox, $peer_bandwidth_textbox, $peer_end_textbox, $peer_DNS_textbox, $peer_private_key_textbox, $peer_preshared_key_textbox, $peer_allowed_ip_textbox, $peer_endpoint_allowed_ips, $peer_mtu, $peer_keep_alive];
        data_list.forEach((ele) => ele.attr("disabled", "disabled"));
        $.ajax({
            method: "POST",
            url: "/save_peer_setting/" + conf_id,
            headers: {
                "Content-Type": "application/json"
            },
            data: JSON.stringify({
                id: peer_id,
                name: $peer_name_textbox.val(),
                bandwidth: $peer_bandwidth_textbox.val(),
                ends_at: +new Date($peer_end_textbox.val()) / 1000,
                DNS: $peer_DNS_textbox.val(),
                private_key: $peer_private_key_textbox.val(),
                allowed_ip: $peer_allowed_ip_textbox.val(),
                endpoint_allowed_ip: $peer_endpoint_allowed_ips.val(),
                MTU: $peer_mtu.val(),
                keep_alive: $peer_keep_alive.val(),
                preshared_key: $peer_preshared_key_textbox.val()
            }),
            success: function (response) {
                if (response.status === "failed") {
                    $("#setting_peer_alert").html(response.msg).removeClass("d-none");
                } else {
                    window.configurations.settingModal().toggle();
                    window.configurations.loadPeers($('#search_peer_textbox').val());
                    $('#alertToast').toast('show');
                    $('#alertToast .toast-body').html("کاربر ذخیره شد!");
                }
                $("#save_peer_setting").removeAttr("disabled").html("ذخیره");
                data_list.forEach((ele) => ele.removeAttr("disabled"));
            }
        });
    } else {
        $("#setting_peer_alert").html("لطفا فیلدهای الزامی را تکمیل نمایید.").removeClass("d-none");
        $("#save_peer_setting").removeAttr("disabled").html("ذخیره");
    }
});

$(".peer_private_key_textbox_switch").on("click", function () {
    let $peer_private_key_textbox = $("#peer_private_key_textbox");
    let mode = (($peer_private_key_textbox.attr('type') === 'password') ? "text" : "password");
    let icon = (($peer_private_key_textbox.attr('type') === 'password') ? "bi bi-eye-slash-fill" : "bi bi-eye-fill");
    $peer_private_key_textbox.attr('type', mode);
    $(".peer_private_key_textbox_switch i").removeClass().addClass(icon);
});

let typingTimer;  let doneTypingInterval = 200; 
$('#search_peer_textbox').on('keyup', function () {
    clearTimeout(typingTimer);
    typingTimer = setTimeout(() => {
        window.configurations.loadPeers($(this).val());
    }, doneTypingInterval);
}).on('keydown', function () {
    clearTimeout(typingTimer);
});

$body.on("change", "#sort_by_dropdown", function () {
    $.ajax({
        method: "POST",
        data: JSON.stringify({'sort': $("#sort_by_dropdown option:selected").val()}),
        headers: {"Content-Type": "application/json"},
        url: "/update_dashboard_sort",
        success: function () {
            window.configurations.loadPeers($('#search_peer_textbox').val());
        }
    });
});

$body.on("mouseenter", ".key", function () {
    let label = $(this).parent().siblings().children()[1];
    label.style.opacity = "100";
}).on("mouseout", ".key", function () {
    let label = $(this).parent().siblings().children()[1];
    label.style.opacity = "0";
    setTimeout(function () {
        label.innerHTML = "جهت کپی کلیک کنید";
    }, 200);
}).on("click", ".key", function () {
    let label = $(this).parent().siblings().children()[1];
    window.configurations.copyToClipboard($(this));
    label.innerHTML = "کپی شد!";
});

$body.on("click", ".update_interval", function () {
    $(".interval-btn-group button").removeClass("active");
    let _new = $(this);
    _new.addClass("active");
    let interval = $(this).data("refresh-interval");
    $.ajax({
        method: "POST",
        data: "interval=" + $(this).data("refresh-interval"),
        url: "/update_dashboard_refresh_interval",
        success: function (res) {
            window.configurations.updateRefreshInterval(res, interval);
        }
    });
});

$body.on("click", ".refresh", function () {
    window.configurations.loadPeers($('#search_peer_textbox').val());
});

let $setting_btn_menu = $(".setting_btn_menu");
$setting_btn_menu.css("top", ($setting_btn_menu.height() + 54) * (-1));
let $setting_btn = $(".setting_btn");

$setting_btn.on("click", function () {
    if ($setting_btn_menu.hasClass("show")) {
        $setting_btn_menu.removeClass("showing");
        setTimeout(function () {
            $setting_btn_menu.removeClass("show");
        }, 201);
    } else {
        $setting_btn_menu.addClass("show");
        setTimeout(function () {
            $setting_btn_menu.addClass("showing");
        }, 10);
    }
});

$("html").on("click", function (r) {
    if (document.querySelector(".setting_btn") !== r.target) {
        if (!document.querySelector(".setting_btn").contains(r.target)) {
            if (!document.querySelector(".setting_btn_menu").contains(r.target)) {
                $setting_btn_menu.removeClass("showing");
                setTimeout(function () {
                    $setting_btn_menu.removeClass("show");
                }, 310);
            }
        }
    }
});

$("#delete_peers_by_bulk_btn").on("click", () => {
    let $delete_bulk_modal_list = $("#delete_bulk_modal .list-group");
    $delete_bulk_modal_list.html('');
    peers.forEach((peer) => {
        let name;
        if (peer.name === "") {
            name = "Untitled Peer";
        } else {
            name = peer.name;
        }
        $delete_bulk_modal_list.append('<a class="list-group-item list-group-item-action delete-bulk-peer-item" style="cursor: pointer" data-id="' +
            peer.id + '" data-name="' + name + '">' + name + '<br><code>' + peer.id + '</code></a>');
    });
    window.configurations.deleteBulkModal().toggle();
});

$body.on("click", ".delete-bulk-peer-item", function () {
    window.configurations.toggleDeleteByBulkIP($(this));
}).on("click", ".delete-peer-bulk-badge", function () {
    window.configurations.toggleDeleteByBulkIP($(".delete-bulk-peer-item[data-id='" + $(this).data("id") + "']"));
});

let $selected_peer_list = document.getElementById("selected_peer_list");

let changeObserver = new MutationObserver(function () {
    if ($selected_peer_list.hasChildNodes()) {
        $("#confirm_delete_bulk_peers").removeAttr("disabled");
    } else {
        $("#confirm_delete_bulk_peers").attr("disabled", "disabled");
    }
});
changeObserver.observe($selected_peer_list, {
    attributes: true,
    childList: true,
    characterData: true
});

let confirm_delete_bulk_peers_interval;

$("#confirm_delete_bulk_peers").on("click", function () {
    let btn = $(this);
    if (confirm_delete_bulk_peers_interval !== undefined) {
        clearInterval(confirm_delete_bulk_peers_interval);
        confirm_delete_bulk_peers_interval = undefined;
        btn.html("Delete");
    } else {
        let timer = 5;
        btn.html(`Deleting in ${timer} secs... Click to cancel`);
        confirm_delete_bulk_peers_interval = setInterval(function () {
            timer -= 1;
            btn.html(`Deleting in ${timer} secs... Click to cancel`);
            if (timer === 0) {
                btn.html(`Deleting...`);
                btn.attr("disabled", "disabled");
                let ips = [];
                $selected_peer_list.childNodes.forEach((ele) => ips.push(ele.dataset.id));
                window.configurations.deletePeers(btn.data("conf"), ips);
                clearInterval(confirm_delete_bulk_peers_interval);
                confirm_delete_bulk_peers_interval = undefined;
            }
        }, 1000);
    }
});

$("#select_all_delete_bulk_peers").on("click", function () {
    $(".delete-bulk-peer-item").each(function () {
        if (!$(this).hasClass("active")) {
            window.configurations.toggleDeleteByBulkIP($(this));
        }
    });
});

$(window.configurations.deleteBulkModal()._element).on("hidden.bs.modal", function () {
    $(".delete-bulk-peer-item").each(function () {
        if ($(this).hasClass("active")) {
            window.configurations.toggleDeleteByBulkIP($(this));
        }
    });
});

$body.on("click", ".btn-download-peer", function (e) {
    e.preventDefault();
    let link = $(this).attr("href");
    $.ajax({
        "url": link,
        "method": "GET",
        success: function (res) {
            window.configurations.downloadOneConfig(res);
        }
    });
});

$("#download_all_peers").on("click", function () {
    $.ajax({
        "url": $(this).data("url"),
        "method": "GET",
        success: function (res) {
            if (res.peers.length > 0) {
                window.wireguard.generateZipFiles(res);
                 window.configurations.showToast("دانلود فایل Zip کاربران با موفقیت انجام شد!");
            } else {
                window.configurations.showToast("اوه! هیچ کاربر قابل دانلودی وجود ندارد.");
            }
        }
    });
});
