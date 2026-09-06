<!DOCTYPE html>
<head>
	<title>Responsive Email</title>
	<style type="text/css">
		body, table, td, a {
			-webkit-text-size-adjust: 100%;
			-ms-text-size-adjust: 100%;
		}

		body, html {
			margin: 0;
			padding: 0;
			width: 100% !important;
		}

		h1, h2, p, a {
			font-family: Arial, sans-serif;
			line-height: 1.3;
		}

		img {
			max-width: 600px;
			width: 100%;
			display: block;
		}

		.container {
			width: 100%;
			padding: 10px;
		}

		.content {
			display: block;
			padding: 1em;
		}

		h1, h2 {
			margin: 0;
		}

		@media only screen and (min-width: 600px) {
			.container {
				width: 100% !important;
				max-width: 600px !important;
				margin: 0 auto !important;
				display: block !important;
			}


			.content {
				width: 50% !important;
				font-size: 16px !important;
				display: table-cell !important;
			}
		}
	</style>
</head>
<html lang="en">
	<body>
		<div lang="en" dir="ltr" style="padding:0; margin:0;">
			<table class="container" role="presentation" width="600" cellspacing="0" cellpadding="0" align="center" style="border-collapse:collapse;max-width:600px;width:100%;">
				<tr>
					<td align="center">
						<h1> {{ config('app.name') }}</h1>
					</td>
				</tr>
				<tr>
					<td>
						<!--[if mso]>
						<table role="presentation" align="center" width="600" border="0" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
							<tr>
								<td>
						<![endif]-->
                                    <table role="presentation" border="0" cellspacing="0" cellpadding="0" style="border-collapse:collapse;max-width:600px;width:100%" width="600">
                                        <tr>
                                            <td class="content">
                                                {{ $slot }}
                                            </td>
                                        </tr>
                                    </table>
						<!--[if mso]>
								</td>
							</tr>
						</table>
						<![endif]-->
					</td>
				</tr>
				<tr>
					<td>
						<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" align="center" style="border-collapse:collapse;">
							<tr>
								<td class="content" style="border-top:thin solid #000;">
                                    <p>If you did not request this, please ignore this email.</p>
									<p>
                                        Thanks,<br>
                                        {{ config('app.name') }}
                                    </p>
								</td>
							</tr>
						</table>
					</td>
				</tr>
			</table>
		</div>
	</body>
</html>
